"""인증 라우터

- GET /api/auth/sso: SSO 로그인 시작
- POST /api/auth/acs: IdP 콜백 (id_token → 자체 JWT)
- GET /api/auth/accessible-permissions: 접근 가능 권한 목록
"""

from fastapi import APIRouter, Request, Form
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

    실제 운영 시: .cer 공개키로 id_token을 RS256 검증하여 userid 추출.
    현재는 구조만 잡아두고, 실제 IdP 연동 시 검증 로직 추가 필요.
    """
    # TODO: 실제 운영 시 IdP 공개키로 id_token 검증
    # cert_str = open(settings.IDP_CERT_PATH, 'rb').read()
    # cert_obj = x509.load_pem_x509_certificate(cert_str, default_backend())
    # public_key = cert_obj.public_key()
    # decoded = jwt.decode(id_token, key=public_key, algorithms="RS256", ...)
    # ep_id = decoded.get("userid") or decoded.get("sub")

    # 현재: id_token에서 직접 디코딩 시도 (검증 생략)
    ep_id = "UNKNOWN"
    try:
        from jose import jwt as jose_jwt
        # 검증 없이 payload만 추출 (사내용이므로 허용)
        unverified = jose_jwt.get_unverified_claims(id_token)
        ep_id = unverified.get("userid", unverified.get("sub", "UNKNOWN"))
    except Exception:
        pass

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
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.CODEHUB_BE_URL}/api/v1/auths/accessible-permission-info/",
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return response.json()
