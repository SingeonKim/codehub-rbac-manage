# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

CodeHub 서비스의 RBAC(유저/그룹/권한/메뉴)를 관리하는 사내용 웹 마이크로서비스.
자체 DB 없이 기존 CodeHub Backend(DRF)의 API를 활용하며, 사외망 개발을 위한 Dummy 모드를 지원한다.

## 기술 스택

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 (설정 파일 없음) + shadcn/ui + lucide-react
- **Backend**: FastAPI (Python) + PyJWT + pydantic-settings + httpx
- **인증**: OIDC 기반 사내 SSO → FastAPI에서 자체 JWT 발급 (HS256, 12시간 만료)

## 아키텍처

```
Next.js FE → (rewrite proxy) → FastAPI BE → CodeHub BE (DRF)
                                     ↕
                                사내 IdP (OIDC)
```

- **Next.js rewrite 프록시**: `next.config.ts`에서 `/api/*` → `https://localhost:8000/api/*`로 전달. 브라우저는 동일 출처로 API 호출하므로 CORS 불필요
- **FastAPI는 단순 프록시가 아님**: CodeHub BE에 페이지네이션이 없으므로, FastAPI가 인메모리 캐싱 + 자체 페이지네이션 + 검색/필터링을 수행하는 데이터 레이어 역할
- **Dummy 모드** (`DUMMY_MODE=true`): CodeHub BE와 IdP 호출 없이 FastAPI 내부 Mock 데이터로 동작
- **RBAC 모델**: User ↔ Group ↔ Permission ↔ Menu (모두 M:M 관계)

## 핵심 제약사항

- CodeHub BE List API가 전체 데이터를 반환 (유저 약 4~5천명)
- `defaultUser` 그룹은 전체 유저 포함 → 해당 그룹 필터링 시 특수 처리 필요
- 사외망에서 개발 후 사내망 도입 → 모든 외부 의존을 Dummy로 대체 가능해야 함

## 주요 문서

- `codehub-rbac-manage-requirements.md`: 통합 요구사항 정의서 (기능, 화면, API 스펙, 인증 흐름 전체 포함)
- `codehub-idp-sso-spec.md`: SSO 인증 흐름 원본
- `codehub-rbac-model-api-spec.md`: CodeHub BE RBAC 모델 및 API 스펙 원본

## 개발 커맨드

### Dummy 모드 (사외망 / HTTP)

```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev       # http://localhost:3000
cd frontend && npm run build     # 프로덕션 빌드
cd frontend && npm run lint      # ESLint
```

### SSO 연동 테스트 (사내망 / HTTPS)

mkcert 인증서 사전 발급 필요 → README.md 참고

```bash
# Backend (SSL 인증서 지정)
cd backend && uvicorn app.main:app --reload --port 8000 \
  --ssl-keyfile ../certs/localhost-key.pem \
  --ssl-certfile ../certs/localhost.pem

# Frontend (scripts/dev.js가 mkcert CA를 NODE_EXTRA_CA_CERTS로 자동 주입)
cd frontend && npm run dev:https  # https://localhost:3000
```

## 프로젝트 구조 핵심

```
frontend/src/
├── app/(main)/          # 인증+인가 보호 레이아웃 아래의 모든 관리 페이지
│   ├── layout.tsx       # isAuthenticated() + hasRbacAccess() 2단계 체크
│   ├── page.tsx         # 대시보드
│   ├── users/           # 유저 관리
│   ├── groups/          # 그룹 관리
│   ├── permissions/     # 권한 관리
│   └── menus/           # 메뉴 관리
├── app/login/           # SSO 로그인
├── app/auth/            # SSO 콜백 (token 저장 + 권한 체크 + access 플래그 설정)
├── components/features/ # Pagination, ConfirmDialog, RelationManager
└── lib/
    ├── api.ts           # fetch wrapper (Bearer 토큰 자동 첨부, 401 → /login 리다이렉트)
    ├── auth.ts          # localStorage 기반 토큰/권한 플래그 관리
    └── types.ts         # 타입 정의

backend/app/
├── main.py              # FastAPI 앱 + DUMMY_MODE에 따라 mock/proxy 라우터 조건부 등록
├── config.py            # pydantic-settings BaseSettings (.env 자동 로드 + 타입 검증)
├── schemas.py           # Pydantic 모델 (PaginatedResponse, UserBase/Create/Update 등)
├── auth/                # SSO 라우터 + JWT 유틸 (모든 모드 공통)
├── mock/                # Dummy 모드 인메모리 CRUD
└── proxy/               # 일반 모드: CodeHub BE 프록시 + TTL 캐시
    ├── router.py        # 캐시 조회 → 필터링 → 페이지네이션 → CUD 후 캐시 무효화
    ├── client.py        # httpx 기반 CodeHub BE 호출 (verify=CODEHUB_BE_VERIFY_SSL)
    └── cache.py         # dict 기반 TTL 캐시 (get/set/invalidate)
```

## 아키텍처 패턴

### DUMMY_MODE 라우터 분기 (main.py)
```python
if settings.DUMMY_MODE:
    app.include_router(mock_router)   # Mock 인메모리 CRUD
else:
    app.include_router(proxy_router)  # CodeHub BE 프록시 + 캐싱
```
두 라우터는 동일 경로(`/api/v1/users` 등), 동일 쿼리 파라미터, 동일 응답 형식(`PaginatedResponse`)을 사용. 데이터 소스만 다름.

### 인증/인가 2단계 체크 (프론트엔드)
- **1단계 (isAuthenticated)**: JWT 토큰 존재 + 만료 여부 → localStorage `codehub_rbac_token`
- **2단계 (hasRbacAccess)**: CodeHubRbacManage 권한 플래그 → localStorage `codehub_rbac_access`
- **두 값은 같은 생명주기**: `removeToken()` 호출 시 플래그도 함께 삭제
- **체크 지점**: `(main)/layout.tsx`(진입 시), `login/page.tsx`(이미 로그인 시 리다이렉트 조건)

### 캐시 전략 (proxy/cache.py)
- **TTL**: 유저 300초(5분), 그룹/권한/메뉴 600초(10분) — `config.py`에서 설정
- **무효화**: POST/PATCH/DELETE 성공 후 `cache.invalidate(key)` 즉시 호출
- **조회**: `cache.get(key)` → TTL 내면 반환, 만료면 None → CodeHub BE 재호출

### pydantic-settings 설정 관리 (config.py)
- `.env` 파일 자동 로드 + 타입 변환 + 서버 시작 시 ValidationError
- 우선순위: OS 환경변수 > `.env` 파일 > 클래스 기본값

## 커밋 전략

하나의 요청이라도 변경 레이어가 다르면 레이어별로 커밋을 분리한다.

### 커밋 단위 기준

| 레이어 | 해당 파일 | 커밋 prefix 예시 |
|--------|-----------|-----------------|
| 스펙 문서 | `codehub-rbac-model-api-spec.md`, `codehub-rbac-manage-requirements.md`, `CLAUDE.md` | `docs:` |
| 백엔드 | `backend/app/**` (schemas, router, config, auth 등) | `feat(backend):` / `fix(backend):` |
| Mock 데이터 | `backend/app/mock/` | `fix(mock):` / `feat(mock):` — 백엔드 로직 변경과 내용이 다르면 분리 |
| 프론트엔드 | `frontend/src/**` | `feat(frontend):` / `fix(frontend):` |

### 분리 예시

방금 작업 "Django 모델 기반 null/blank 처리 수정"은 다음 3개로 분리하는 것이 적절:
1. `docs: update model spec with null/blank field constraints` → 스펙 문서 2개
2. `fix(backend): align UserBase schema and mock data with Django model` → schemas.py + mock/data.py
3. `fix(frontend): handle nullable fields in user form and update types` → types.ts + users/page.tsx

### 같은 커밋으로 묶어도 되는 경우
- 동일 레이어 내 밀접하게 연관된 변경 (e.g., schema 변경 + 그에 따른 mock 데이터 수정)
- 2~3줄 이하의 아주 작은 보조 변경이 다른 레이어에 있을 때

## 디자인 가이드

- Primary: `#0d6154`, Secondary: `#46cf94`, 배경: 흰색 계열
- 스타일: 심플 미니멀리즘, 다크 모드 미지원
