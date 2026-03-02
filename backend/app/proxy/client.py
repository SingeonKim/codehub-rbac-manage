"""CodeHub BE HTTP 클라이언트

모든 요청에 Authorization 헤더를 그대로 전달한다.
"""

import httpx
from fastapi import HTTPException

from app.config import settings


async def fetch_all(path: str, token: str) -> list:
    """CodeHub BE List API 전체 조회 (페이지네이션 없음)"""
    url = f"{settings.CODEHUB_BE_URL}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
        )
        if not response.is_success:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"CodeHub BE error: {response.text}",
            )
        data = response.json()
        # DRF는 리스트 또는 {"results": [...]} 형태로 응답할 수 있다
        if isinstance(data, list):
            return data
        return data.get("results", data)


async def proxy_request(
    method: str,
    path: str,
    token: str,
    json_body: dict | None = None,
) -> dict | None:
    """CodeHub BE로 단건 요청을 프록시 (Detail, Create, Update, Delete)"""
    url = f"{settings.CODEHUB_BE_URL}{path}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.request(
            method=method,
            url=url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=json_body,
        )
        if response.status_code == 204:
            return None
        if not response.is_success:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"CodeHub BE error: {response.text}",
            )
        return response.json()
