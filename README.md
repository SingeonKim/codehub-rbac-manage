# CodeHub RBAC Manage

CodeHub 서비스의 RBAC(유저/그룹/권한/메뉴)를 관리하는 사내용 웹 마이크로서비스.

## 로컬 실행 (Dummy 모드 — 사외망)

CodeHub BE와 사내 IdP 없이 Mock 데이터로 전체 기능을 실행할 수 있다.

### Backend

```bash
cd backend
pip install -r requirements.txt

# .env 파일 생성 (Dummy 모드)
cp .env.example .env
# DUMMY_MODE=true 확인

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

로그인 페이지에서 **SSO 로그인** 버튼 클릭 → Dummy 모드에서는 IdP 없이 즉시 로그인된다.

---

## 로컬 HTTPS 설정 (사내 SSO 연동 시)

사내 AD SSO는 ACS 콜백(`/api/auth/acs`)을 HTTPS로만 허용한다.
아래 절차로 로컬 신뢰 인증서를 발급하고 HTTPS로 서버를 기동한다.

### 1단계: mkcert 설치 및 로컬 CA 등록

```bash
# mkcert 설치 (winget 또는 scoop)
winget install FiloSottile.mkcert
# 또는: scoop install mkcert

# 로컬 CA를 시스템(Windows + 브라우저) 신뢰 저장소에 등록
# → 이후 발급한 인증서에 브라우저 경고 없음
mkcert -install
```

### 2단계: localhost 인증서 발급

프로젝트 루트에서 실행:

```bash
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1
```

`certs/` 폴더에 아래 파일이 생성된다 (`.gitignore`로 커밋 제외):
- `certs/localhost.pem` — 인증서
- `certs/localhost-key.pem` — 개인키

### 3단계: Backend HTTPS 실행

```bash
cd backend

# .env 파일의 URL을 HTTPS로 확인 (SP_REDIRECT_URL, FRONTEND_URL)
cp .env.example .env
# SP_REDIRECT_URL=https://localhost:8000/api/auth/acs
# FRONTEND_URL=https://localhost:3000
# DUMMY_MODE=false  ← SSO 연동 시

uvicorn app.main:app --reload --port 8000 \
  --ssl-keyfile ../certs/localhost-key.pem \
  --ssl-certfile ../certs/localhost.pem
```

### 4단계: Frontend HTTPS 실행

```bash
cd frontend
npm run dev:https   # https://localhost:3000
```

브라우저에서 `https://localhost:8000/api/health` 및 `https://localhost:3000` 자물쇠 아이콘 확인 후 SSO 테스트 진행.

## 프로젝트 구조

```
codehub-rbac-manage/
├── frontend/          # Next.js 15 (App Router)
│   └── src/
│       ├── app/
│       │   ├── (main)/        # 인증 보호 레이아웃 + 각 관리 페이지
│       │   ├── login/         # SSO 로그인 페이지
│       │   └── auth/          # SSO 콜백 처리
│       ├── components/
│       │   ├── ui/            # shadcn/ui 컴포넌트
│       │   ├── layout/        # Sidebar, Header
│       │   └── features/      # 공통 CRUD 컴포넌트 (Pagination, RelationManager 등)
│       └── lib/               # API 클라이언트, 인증 유틸, 타입 정의
│
└── backend/           # FastAPI
    └── app/
        ├── auth/      # SSO 인증 라우터 + JWT 유틸
        ├── mock/      # Dummy 모드 Mock API (인메모리 CRUD)
        └── proxy/     # 일반 모드 CodeHub BE 프록시 + TTL 캐시
```

## 환경변수

`backend/.env.example` 참고. 주요 항목:

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DUMMY_MODE` | Dummy 모드 활성화 | `true` |
| `CODEHUB_BE_URL` | CodeHub BE URL | - |
| `JWT_SECRET_KEY` | JWT 서명 시크릿 | `dev-secret-key` |
| `FRONTEND_URL` | 프론트엔드 URL | `http://localhost:3000` |
