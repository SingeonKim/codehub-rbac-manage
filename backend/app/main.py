from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="CodeHub RBAC Manage API",
    description="CodeHub RBAC 관리 서비스 백엔드",
    version="0.1.0",
)

# CORS 설정 - FE에서 API 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "dummy_mode": settings.DUMMY_MODE,
    }


# 인증 라우터 (모든 모드에서 사용)
from app.auth.router import router as auth_router
app.include_router(auth_router)

# 모드에 따라 라우터 선택: Dummy → Mock, 일반 → CodeHub BE 프록시
if settings.DUMMY_MODE:
    from app.mock.router import router as mock_router
    app.include_router(mock_router)
else:
    from app.proxy.router import router as proxy_router
    app.include_router(proxy_router)
