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
