"""인증 라우터

- GET /api/auth/sso: SSO 로그인 시작
- POST /api/auth/acs: IdP 콜백 (id_token → 자체 JWT)
- GET /api/auth/accessible-permissions: 접근 가능 권한 목록
"""

import jwt  # PyJWT 패키지
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, Form
from fastapi.responses import RedirectResponse

from app.config import settings
from app.auth.sso import (
    create_access_token,
    verify_token,
    get_token_from_request,
    build_idp_redirect_url,
)
from app.schemas import AccessiblePermission

router = APIRouter(prefix="/api/auth")


@router.get("/sso")
async def sso_login():
    """SSO 로그인 시작

    - Dummy 모드: IdP 없이 즉시 JWT 발급 후 FE로 리다이렉트
    - 일반 모드: IdP 인증 URL로 리다이렉트
    """
    if settings.DUMMY_MODE:
        # Dummy 사용자로 즉시 토큰 발급
        token = create_access_token(ep_id="DUMMY_EP001")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth?token={token}",
            status_code=302,
        )

    # 일반 모드: IdP로 리다이렉트
    idp_url = build_idp_redirect_url()
    return RedirectResponse(url=idp_url, status_code=302)


@router.post("/acs")
async def acs_callback(id_token: str = Form(...)):
    """IdP 콜백 - id_token 수신, 검증 후 자체 JWT 발급

    - Dummy 모드: id_token 검증 없이 즉시 임시 사용자로 JWT 발급
    - 일반 모드: IDP_CERT_FILE_PATH/IDP_CERT_FILE_NAME 인증서 공개키로 RS256 검증 후 userid 추출
    """
    if settings.DUMMY_MODE:
        # Dummy 모드: 실제 IdP 없이 임시 사용자로 즉시 토큰 발급
        token = create_access_token(ep_id="DUMMY_EP001")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth?token={token}",
            status_code=302,
        )

    # 일반 모드: IdP 인증서(공개키)로 id_token RS256 검증
    # PyJWT + cryptography 조합으로 X.509 인증서에서 공개키를 추출해 검증
    try:
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend

        # IDP_CERT_FILE_PATH + IDP_CERT_FILE_NAME 조합으로 인증서 파일 경로 생성
        cert_path = Path(settings.IDP_CERT_FILE_PATH) / settings.IDP_CERT_FILE_NAME
        cert_bytes = open(cert_path, "rb").read()
        cert_obj = x509.load_pem_x509_certificate(cert_bytes, default_backend())
        public_key = cert_obj.public_key()

        # RS256 알고리즘으로 서명 검증 + 만료 검증 자동 수행
        # audience: IdP가 발급한 토큰의 aud 클레임이 client_id와 일치해야 함
        decoded = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.IDP_CLIENT_ID,
        )
        # IdP마다 사용자 식별자 클레임명이 다를 수 있음 (userid 또는 sub)
        ep_id = decoded.get("userid") or decoded.get("sub") or "UNKNOWN"

    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="IdP certificate file not found")
    except jwt.PyJWTError as e:
        # 서명 불일치, 만료, audience 불일치 등 모든 JWT 검증 실패
        raise HTTPException(status_code=401, detail=f"Invalid id_token: {str(e)}")

    token = create_access_token(ep_id=ep_id)
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth?token={token}",
        status_code=302,
    )


@router.get("/accessible-permissions")
async def accessible_permissions(request: Request):
    """현재 토큰 사용자의 접근 가능 권한 목록 반환"""
    token = get_token_from_request(request)
    payload = verify_token(token)

    if settings.DUMMY_MODE:
        # Dummy 모드: 항상 CodeHubRbacManage 포함
        return [
            AccessiblePermission(permission_name="CodeHubRbacManage"),
            AccessiblePermission(permission_name="HomeMenuPermission"),
            AccessiblePermission(permission_name="DashboardPermission"),
        ]

    # 일반 모드: CodeHub BE에 권한 조회 요청 전달
    # proxy/client.py와 동일하게 verify 설정 적용 (로컬 mkcert 환경 대응)
    import httpx
    async with httpx.AsyncClient(verify=settings.CODEHUB_BE_VERIFY_SSL) as client:
        response = await client.get(
            f"{settings.CODEHUB_BE_URL}/api/v1/auths/accessible-permission-info/",
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return response.json()
