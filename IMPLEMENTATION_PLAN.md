# CodeHub RBAC Manage - 구현 플랜

> 작성일: 2026-03-02
> 참조: codehub-rbac-manage-requirements.md

---

## 1. 프로젝트 구조

사내 마이크로서비스 규모에 맞춰 **플랫 구조** (`frontend/` + `backend/`)를 채택한다.
Turborepo 등의 오케스트레이션은 과도하므로 사용하지 않는다.

```
codehub-rbac-manage/
├── frontend/                    # Next.js 15 App Router
│   ├── app/
│   │   ├── layout.tsx           # 루트 레이아웃
│   │   ├── page.tsx             # 대시보드 (/)
│   │   ├── login/page.tsx       # 로그인
│   │   ├── auth/page.tsx        # SSO 콜백
│   │   ├── users/page.tsx       # 유저 관리
│   │   ├── groups/page.tsx      # 그룹 관리
│   │   ├── permissions/page.tsx # 권한 관리
│   │   └── menus/page.tsx       # 메뉴 관리
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 컴포넌트
│   │   ├── layout/              # Sidebar, Header 등 레이아웃
│   │   └── features/            # 도메인별 컴포넌트 (users/, groups/ 등)
│   ├── lib/
│   │   ├── api.ts               # API 클라이언트 (fetch wrapper)
│   │   ├── auth.ts              # 토큰 관리, 인증 유틸
│   │   └── types.ts             # 공유 타입 정의
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 엔트리
│   │   ├── config.py            # 환경변수, 설정
│   │   ├── auth/                # SSO 인증 라우터
│   │   │   ├── router.py
│   │   │   └── sso.py
│   │   ├── proxy/               # CodeHub BE 프록시 + 캐싱 레이어
│   │   │   ├── router.py
│   │   │   ├── cache.py         # 인메모리 캐시 관리
│   │   │   └── client.py        # CodeHub BE HTTP 클라이언트
│   │   ├── mock/                # Dummy 모드 Mock 데이터
│   │   │   ├── router.py
│   │   │   └── data.py
│   │   └── schemas.py           # Pydantic 모델
│   ├── requirements.txt
│   └── .env.example
│
├── codehub-rbac-manage-requirements.md
├── IMPLEMENTATION_PLAN.md
├── CLAUDE.md
├── .gitignore
└── README.md
```

---

## 2. 구현 단계 (Steps)

### Step 0: 프로젝트 초기화 및 Git 세팅

**작업 내용:**
- Git 저장소 초기화
- `.gitignore` 생성 (Node.js + Python + IDE)
- 기존 문서 파일 정리

**커밋:**
```
chore: initialize git repository with project documents
```

---

### Step 1: Frontend 프로젝트 세팅

**작업 내용:**
- `npx create-next-app@latest frontend --ts --tailwind --eslint --app`
- shadcn/ui 초기화: `npx shadcn@latest init` (new-york 스타일)
- Tailwind CSS v4 커스텀 테마 설정 (`globals.css`에 Primary `#0d6154`, Secondary `#46cf94`)
- 필수 shadcn/ui 컴포넌트 추가: button, input, dialog, table, dropdown-menu, toast(sonner), card, badge, separator, sheet
- lucide-react 설치 확인 (create-next-app에 포함)

**커밋:**
```
chore: scaffold Next.js 15 frontend with Tailwind v4 and shadcn/ui
```

---

### Step 2: Backend 프로젝트 세팅

**작업 내용:**
- `backend/` 디렉토리 구조 생성
- `requirements.txt` 작성: fastapi, uvicorn, python-jose[cryptography], httpx, python-dotenv, cryptography
- FastAPI 앱 기본 엔트리 (`main.py`) + CORS 설정
- `config.py`: 환경변수 로딩 (DUMMY_MODE, CODEHUB_BE_URL 등)
- `.env.example` 작성

**커밋:**
```
chore: scaffold FastAPI backend with config and CORS setup
```

---

### Step 3: Backend - Dummy 모드 Mock API

**왜 먼저?** Frontend 개발을 병행하려면 동작하는 API가 필요하다.
Dummy 모드를 먼저 구현하면 CodeHub BE 없이도 전체 흐름을 개발/검증할 수 있다.

**작업 내용:**
- `mock/data.py`: 유저(20~30건 샘플), 그룹(5건), 권한(10건), 메뉴(10건) Mock 데이터
- `schemas.py`: Pydantic 모델 (User, Group, Permission, Menu, PaginatedResponse)
- `mock/router.py`: 4개 엔티티의 CRUD 엔드포인트 (인메모리 리스트 기반)
  - List: 페이지네이션 + 검색 + 필터링 지원
  - Create/Update/Delete: 인메모리 조작
- `main.py`에서 DUMMY_MODE일 때 mock router 마운트

**커밋:**
```
feat: implement dummy mode mock API with CRUD and pagination
```

---

### Step 4: Backend - SSO 인증 (Dummy 모드 포함)

**작업 내용:**
- `auth/router.py`:
  - `GET /api/auth/sso`: Dummy 모드면 즉시 JWT 발급 후 FE redirect, 일반 모드면 IdP redirect
  - `POST /api/auth/acs`: IdP 콜백 처리 (id_token 검증 → 자체 JWT 발급 → FE redirect)
  - `GET /api/auth/accessible-permissions`: 토큰 검증 후 권한 목록 반환
- `auth/sso.py`: JWT 생성/검증 유틸, IdP URL 빌드
- Dummy 모드: 고정 사용자(ep_id: "dummy_user")로 JWT 즉시 발급, 권한에 항상 CodeHubRbacManage 포함

**커밋:**
```
feat: implement SSO authentication flow with dummy mode support
```

---

### Step 5: Frontend - 인증 흐름 및 공통 레이아웃

**작업 내용:**
- `lib/api.ts`: fetch wrapper (Authorization 헤더 자동 첨부, 401 시 로그인 리다이렉트)
- `lib/auth.ts`: 토큰 저장/조회/삭제, 만료 체크
- `lib/types.ts`: User, Group, Permission, Menu, PaginatedResponse 타입 정의
- `app/login/page.tsx`: SSO 로그인 버튼
- `app/auth/page.tsx`: 콜백 처리 (token 저장 → 권한 체크 → 대시보드 리다이렉트)
- `components/layout/sidebar.tsx`: 사이드 네비게이션 (대시보드, 유저, 그룹, 권한, 메뉴)
- `components/layout/header.tsx`: 로그인 사용자 정보, 로그아웃 버튼
- `app/layout.tsx`: 인증 체크 + Sidebar + Header 조합
- 미인증 시 로그인 페이지로 리다이렉트하는 보호 로직

**커밋:**
```
feat: implement auth flow, common layout with sidebar and header
```

---

### Step 6: Frontend - 대시보드 페이지

**작업 내용:**
- `app/page.tsx`: 대시보드
  - 유저/그룹/권한/메뉴 총 건수를 카드로 표시
  - 최근 생성/수정 유저 간략 테이블
- API 호출: 각 엔티티의 List API에서 total 값 활용

**커밋:**
```
feat: implement dashboard page with summary cards
```

---

### Step 7: Frontend - 공통 CRUD 테이블 컴포넌트

**왜 별도 단계?** 유저/그룹/권한/메뉴 4개 페이지가 동일한 테이블 패턴(목록+검색+페이지네이션+생성/수정 모달+삭제 확인)을 사용한다.
공통 컴포넌트를 먼저 만들면 각 페이지 구현이 빨라진다.

**작업 내용:**
- `components/features/data-table.tsx`: 범용 데이터 테이블 (서버사이드 페이지네이션 연동)
- `components/features/search-bar.tsx`: 검색어 입력 + 필터 드롭다운
- `components/features/pagination.tsx`: 페이지 이동 컨트롤
- `components/features/confirm-dialog.tsx`: 삭제 확인 다이얼로그
- `components/features/entity-form-dialog.tsx`: 생성/수정 폼 모달 (필드 구성은 props로 전달)

**커밋:**
```
feat: implement reusable data table, search, pagination, and form dialog components
```

---

### Step 8: Frontend - 메뉴 관리 페이지

**왜 메뉴부터?** 4개 엔티티 중 가장 단순하다 (필드 2개, M:M 관계 관리 없음).
공통 컴포넌트의 동작을 검증하는 첫 번째 페이지로 적합하다.

**작업 내용:**
- `app/menus/page.tsx`: 메뉴 목록, 검색, 생성/수정/삭제
- `components/features/menus/`: 메뉴 전용 폼 컴포넌트

**커밋:**
```
feat: implement menu management page with CRUD operations
```

---

### Step 9: Frontend - 권한 관리 페이지

**작업 내용:**
- `app/permissions/page.tsx`: 권한 목록, 검색, 생성/수정/삭제
- 권한-메뉴 M:M 관계 관리 UI (태그 형태 + 드롭다운 추가/제거)
- `components/features/relation-manager.tsx`: M:M 관계 추가/제거 공통 컴포넌트 (여기서 최초 구현)

**커밋:**
```
feat: implement permission management page with menu relation management
```

---

### Step 10: Frontend - 그룹 관리 페이지

**작업 내용:**
- `app/groups/page.tsx`: 그룹 목록, 검색, 생성/수정/삭제
- 그룹-권한 M:M 관계 관리 (relation-manager 재사용)

**커밋:**
```
feat: implement group management page with permission relation management
```

---

### Step 11: Frontend - 유저 관리 페이지

**왜 마지막?** 가장 복잡하다 (필드 다수, 그룹 필터링, defaultUser 그룹 제외 로직).

**작업 내용:**
- `app/users/page.tsx`: 유저 목록, 검색, 그룹별 필터링, 생성/수정/삭제
- 그룹 필터 드롭다운에서 defaultUser 그룹 제외 처리
- 유저-그룹 M:M 관계 관리 (relation-manager 재사용)
- 유저 필드가 많으므로 폼 레이아웃 별도 구성

**커밋:**
```
feat: implement user management page with group filtering and relation management
```

---

### Step 12: Backend - CodeHub BE 프록시 + 캐싱 레이어 (일반 모드)

**작업 내용:**
- `proxy/client.py`: httpx 기반 CodeHub BE HTTP 클라이언트
- `proxy/cache.py`: 인메모리 캐시 (TTL 기반, CUD 시 무효화)
  - User: TTL 5분
  - Group/Permission/Menu: TTL 10분
- `proxy/router.py`: 4개 엔티티 라우터
  - List: 캐시에서 필터링/검색/페이지네이션 처리 후 응답
  - Detail: CodeHub BE로 직접 프록시
  - Create/Update/Delete: CodeHub BE로 프록시 후 캐시 무효화
- `main.py`에서 DUMMY_MODE=false일 때 proxy router 마운트

**커밋:**
```
feat: implement CodeHub BE proxy with in-memory caching and pagination layer
```

---

### Step 13: 통합 테스트 및 마무리

**작업 내용:**
- Dummy 모드에서 전체 CRUD 흐름 E2E 수동 테스트
- API 에러 핸들링 점검 (토큰 만료, 네트워크 에러 등)
- UI 미세 조정 (반응형, 로딩 상태, 토스트 메시지)
- README.md 작성 (로컬 실행 방법, 환경변수 설명)
- CLAUDE.md 업데이트 (빌드/실행 커맨드 추가)

**커밋:**
```
docs: add README with setup instructions and update CLAUDE.md

fix: polish UI and error handling across all pages
```

---

## 3. Git 커밋 전략

### 브랜치 전략

사내 1인(또는 소규모) 개발이므로 간결하게 운영한다.

```
main              ← 안정 버전 (배포 가능 상태)
  └── develop     ← 개발 진행 브랜치 (Step별 커밋이 여기에 쌓임)
        └── feature/*  ← (선택) 복잡한 Step을 분리 작업할 때만 사용
```

- 기본 작업은 `develop` 브랜치에서 진행
- 각 Step 완료 시 커밋
- 전체 완료 후 `develop` → `main` merge

### 커밋 컨벤션

**Conventional Commits** 형식을 따른다.

| Prefix | 용도 | 예시 |
|--------|------|------|
| `chore:` | 프로젝트 세팅, 의존성, 설정 변경 | `chore: scaffold Next.js 15 frontend` |
| `feat:` | 새로운 기능 추가 | `feat: implement user management page` |
| `fix:` | 버그 수정 | `fix: handle token expiry redirect` |
| `refactor:` | 기능 변화 없는 코드 개선 | `refactor: extract common table logic` |
| `docs:` | 문서 변경 | `docs: add README with setup instructions` |
| `style:` | UI/CSS 변경 (로직 무관) | `style: adjust sidebar padding` |

### 커밋 단위 원칙

- **한 Step = 한 커밋**이 기본 (단, Step 내 작업량이 클 경우 의미 단위로 분할 가능)
- 커밋 시점: 해당 Step의 기능이 **독립적으로 동작 가능한 상태**일 때
- 중간 저장 목적의 WIP 커밋은 지양

### 커밋 타임라인 요약

| 순서 | 커밋 메시지 | 주요 내용 |
|------|-----------|----------|
| 0 | `chore: initialize git repository with project documents` | Git 초기화, .gitignore, 문서 |
| 1 | `chore: scaffold Next.js 15 frontend with Tailwind v4 and shadcn/ui` | FE 프로젝트 세팅 |
| 2 | `chore: scaffold FastAPI backend with config and CORS setup` | BE 프로젝트 세팅 |
| 3 | `feat: implement dummy mode mock API with CRUD and pagination` | Mock API |
| 4 | `feat: implement SSO authentication flow with dummy mode support` | 인증 |
| 5 | `feat: implement auth flow, common layout with sidebar and header` | FE 인증 + 레이아웃 |
| 6 | `feat: implement dashboard page with summary cards` | 대시보드 |
| 7 | `feat: implement reusable data table, search, pagination, and form dialog components` | 공통 컴포넌트 |
| 8 | `feat: implement menu management page with CRUD operations` | 메뉴 관리 |
| 9 | `feat: implement permission management page with menu relation management` | 권한 관리 |
| 10 | `feat: implement group management page with permission relation management` | 그룹 관리 |
| 11 | `feat: implement user management page with group filtering and relation management` | 유저 관리 |
| 12 | `feat: implement CodeHub BE proxy with in-memory caching and pagination layer` | 프록시 + 캐싱 |
| 13 | `docs: add README with setup instructions and update CLAUDE.md` | 문서 마무리 |

---

## 4. 로컬 개발 실행 방법 (예정)

```bash
# Backend (Dummy 모드)
cd backend
pip install -r requirements.txt
DUMMY_MODE=true uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev    # http://localhost:3000
```

Frontend의 API 요청은 Next.js의 rewrites 설정으로 `/api/*` → `http://localhost:8000/api/*`로 프록시한다.
