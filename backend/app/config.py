from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """환경변수 기반 애플리케이션 설정.

    pydantic-settings의 BaseSettings를 상속하면:
    - .env 파일을 자동으로 읽어 각 필드에 매핑
    - 필드 타입에 맞게 자동 변환 (str "true" → bool True 등)
    - 타입 불일치 시 서버 시작 시점에 ValidationError로 즉시 감지
    """

    # .env 파일 경로 지정 및 대소문자 무시 설정
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # 운영 모드 (true면 CodeHub BE / IdP 호출 없이 Mock 데이터로 동작)
    DUMMY_MODE: bool = True

    # CodeHub Backend URL (일반 모드에서 프록시 대상)
    CODEHUB_BE_URL: str = "https://codehub-api.internal.com"

    # 사내 IdP (OIDC) 설정
    IDP_ENTITY_ID: str = ""
    IDP_CLIENT_ID: str = ""
    SP_REDIRECT_URL: str = ""
    IDP_CERT_PATH: str = ""  # IdP 공개키 인증서 파일 경로 (.pem)

    # 자체 발급 JWT 시크릿 키 (운영 시 32바이트 이상 랜덤 값으로 교체)
    JWT_SECRET_KEY: str = "dev-secret-key"

    # Next.js 프론트엔드 URL (CORS 허용 대상 + 리다이렉트 대상)
    FRONTEND_URL: str = "http://localhost:3000"

    # 캐시 TTL (초 단위)
    CACHE_TTL_USERS: int = 300    # 유저 목록: 5분
    CACHE_TTL_DEFAULT: int = 600  # 그 외(그룹/권한/메뉴): 10분


settings = Settings()
