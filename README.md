# CodeHub RBAC Manage

CodeHub 서비스의 RBAC(유저/그룹/권한/메뉴)를 관리하는 사내용 웹 마이크로서비스.

## 로컬 실행 (Dummy 모드)

사외망 개발 시 CodeHub BE와 사내 IdP 없이 Mock 데이터로 전체 기능을 실행할 수 있다.

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
