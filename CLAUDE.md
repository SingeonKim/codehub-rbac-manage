# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

CodeHub 서비스의 RBAC(유저/그룹/권한/메뉴)를 관리하는 사내용 웹 마이크로서비스.
자체 DB 없이 기존 CodeHub Backend(DRF)의 API를 활용하며, 사외망 개발을 위한 Dummy 모드를 지원한다.

## 기술 스택

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 (설정 파일 없음) + shadcn/ui + lucide-react
- **Backend**: FastAPI (Python)
- **인증**: OIDC 기반 사내 SSO → FastAPI에서 자체 JWT 발급 (HS256)

## 아키텍처

```
Next.js FE → FastAPI BE → CodeHub BE (DRF)
                ↕
           사내 IdP (OIDC)
```

- **FastAPI는 단순 프록시가 아님**: CodeHub BE에 페이지네이션이 없으므로, FastAPI가 인메모리 캐싱 + 자체 페이지네이션 + 검색/필터링을 수행하는 데이터 레이어 역할
- **Dummy 모드** (`DUMMY_MODE=true`): CodeHub BE와 IdP 호출 없이 FastAPI 내부 Mock 데이터로 동작
- **RBAC 모델**: User ↔ Group ↔ Permission ↔ Menu (모두 M:M 관계)

## 핵심 제약사항

- CodeHub BE List API가 전체 데이터를 반환 (유저 약 4~5천명)
- `defaultUser` 그룹은 전체 유저 포함 → 해당 그룹 필터링 시 특수 처리 필요
- 사외망에서 개발 후 사내망 도입 → 모든 외부 의존을 Dummy로 대체 가능해야 함

## 주요 문서

- `codehub-rbac-manage-requirements.md`: 통합 요구사항 정의서 (기능, 화면, API 스펙, 인증 흐름 전체 포함)
- `codehub-rbac-draft.md`: 초안 (참고용)
- `codehub-idp-sso-spec.md`: SSO 인증 흐름 원본
- `codehub-rbac-model-api-spec.md`: CodeHub BE RBAC 모델 및 API 스펙 원본

## 개발 커맨드

```bash
# Backend (Dummy 모드)
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev       # 개발 서버
cd frontend && npm run build     # 프로덕션 빌드
cd frontend && npm run lint      # ESLint
```

## 프로젝트 구조 핵심

```
frontend/src/
├── app/(main)/          # 인증 보호 레이아웃 아래의 모든 관리 페이지
│   ├── layout.tsx       # 인증 체크 + Sidebar + Header
│   ├── page.tsx         # 대시보드
│   ├── users/           # 유저 관리
│   ├── groups/          # 그룹 관리
│   ├── permissions/     # 권한 관리
│   └── menus/           # 메뉴 관리
├── app/login/           # SSO 로그인
├── app/auth/            # SSO 콜백 (token 저장 + 권한 체크)
├── components/features/ # Pagination, ConfirmDialog, RelationManager
└── lib/                 # api.ts(fetch wrapper), auth.ts(토큰), types.ts

backend/app/
├── auth/                # SSO 라우터 + JWT 유틸 (모든 모드 공통)
├── mock/                # Dummy 모드 인메모리 CRUD
└── proxy/               # 일반 모드: CodeHub BE 프록시 + TTL 캐시
```

## 디자인 가이드

- Primary: `#0d6154`, Secondary: `#46cf94`, 배경: 흰색 계열
- 스타일: 심플 미니멀리즘, 다크 모드 미지원
