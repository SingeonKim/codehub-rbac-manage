import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """환경변수 기반 애플리케이션 설정"""

    DUMMY_MODE: bool = os.getenv("DUMMY_MODE", "true").lower() == "true"
    CODEHUB_BE_URL: str = os.getenv("CODEHUB_BE_URL", "https://codehub-api.internal.com")
    IDP_ENTITY_ID: str = os.getenv("IDP_ENTITY_ID", "")
    IDP_CLIENT_ID: str = os.getenv("IDP_CLIENT_ID", "")
    SP_REDIRECT_URL: str = os.getenv("SP_REDIRECT_URL", "")
    IDP_CERT_PATH: str = os.getenv("IDP_CERT_PATH", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # 캐시 TTL (초 단위)
    CACHE_TTL_USERS: int = int(os.getenv("CACHE_TTL_USERS", "300"))       # 5분
    CACHE_TTL_DEFAULT: int = int(os.getenv("CACHE_TTL_DEFAULT", "600"))    # 10분


settings = Settings()
