"""JWT 생성/검증 및 IdP URL 빌드 유틸"""

import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, Request

from app.config import settings

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 12


def create_access_token(ep_id: str) -> str:
    """자체 JWT Access Token 생성"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "Access-Token",
        "epid": ep_id,
        "iat": int(now.timestamp()),
        "exp": now + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """JWT 토큰 검증 후 payload 반환"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_token_from_request(request: Request) -> str:
    """요청 헤더에서 Bearer 토큰 추출"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    return auth_header[7:]


def build_idp_redirect_url() -> str:
    """IdP 인증 URL 생성"""
    nonce = uuid.uuid4().hex
    params = (
        f"?client_id={settings.IDP_CLIENT_ID}"
        f"&redirect_uri={settings.SP_REDIRECT_URL}"
        f"&response_mode=form_post"
        f"&response_type=code+id_token"
        f"&scope=openid+profile"
        f"&nonce={nonce}"
    )
    return f"{settings.IDP_ENTITY_ID}{params}"
