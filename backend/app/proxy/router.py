"""일반 모드 프록시 라우터

CodeHub BE에서 전체 데이터를 가져와 인메모리 캐싱 후,
FE에 페이지네이션/검색/필터링된 결과를 제공한다.
"""

import math
from fastapi import APIRouter, Request, Query
from typing import Optional

from app.config import settings
from app.schemas import PaginatedResponse
from app.auth.sso import get_token_from_request
from app.proxy import cache, client

router = APIRouter(prefix="/api/v1")

# CodeHub BE API 경로
BE_PATHS = {
    "users": "/api/v1/commons/user/",
    "manual_create": "/api/v1/commons/user-etc/manual-create/",
    "groups": "/api/v1/commons/group/",
    "permissions": "/api/v1/commons/permission/",
    "menus": "/api/v1/commons/menu/",
}

CACHE_KEYS = {
    "users": "cache:users",
    "groups": "cache:groups",
    "permissions": "cache:permissions",
    "menus": "cache:menus",
}

# 각 엔티티 목록 정렬 허용 필드 (화이트리스트 — 임의 필드명 injection 방지)
_USER_SORT_FIELDS = {"id", "full_name", "user_id", "department_name", "department_code", "update_time"}
_GROUP_SORT_FIELDS = {"id", "group_name", "create_time", "update_time"}
_PERMISSION_SORT_FIELDS = {"id", "permission_name", "create_time", "update_time"}
_MENU_SORT_FIELDS = {"id", "menu_name", "permission_code", "create_time", "update_time"}

TTL = {
    "users": settings.CACHE_TTL_USERS,
    "groups": settings.CACHE_TTL_DEFAULT,
    "permissions": settings.CACHE_TTL_DEFAULT,
    "menus": settings.CACHE_TTL_DEFAULT,
}


def _paginate(items: list, page: int, page_size: int) -> PaginatedResponse:
    total = len(items)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    start = (page - 1) * page_size
    return PaginatedResponse(
        items=items[start : start + page_size],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def _get_all(entity: str, token: str) -> list:
    """캐시에서 조회하거나 CodeHub BE에서 전체 fetch 후 캐시."""
    key = CACHE_KEYS[entity]
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = await client.fetch_all(BE_PATHS[entity], token)
    cache.set(key, data, TTL[entity])
    return data


# ===== 유저 API =====

@router.get("/users")
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    group_filter: Optional[int] = None,
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    token = get_token_from_request(request)
    all_items = await _get_all("users", token)

    # 그룹 필터
    if group_filter is not None:
        all_items = [u for u in all_items if group_filter in (u.get("groups") or [])]

    # 검색: user_id/full_name 완전 일치, department_name 부분 일치, department_code 완전 일치
    if search:
        all_items = [
            u for u in all_items
            if u.get("user_id") == search
            or u.get("full_name") == search
            or search in (u.get("department_name") or "")
            or u.get("department_code") == search
        ]

    # 정렬: 허용된 필드만 사용, 기본값 id desc
    effective_sort = sort_by if sort_by in _USER_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    all_items.sort(
        key=lambda u: u.get(effective_sort, 0) if effective_sort == "id"
                      else (u.get(effective_sort) or "").lower(),
        reverse=reverse,
    )

    return _paginate(all_items, page, page_size)


@router.get("/users/{user_id}")
async def get_user(user_id: int, request: Request):
    token = get_token_from_request(request)
    return await client.proxy_request("GET", f"{BE_PATHS['users']}{user_id}/", token)


@router.post("/users", status_code=201)
async def create_user(request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("POST", BE_PATHS["users"], token, body)
    cache.invalidate(CACHE_KEYS["users"])
    return result


@router.post("/users/manual-create")
async def manual_create_users(request: Request, knox_id: str = Query(...)):
    """Knox ID 일괄 생성 — CodeHub BE로 프록시 후 성공 유저가 있으면 캐시 무효화"""
    token = get_token_from_request(request)
    # knox_id를 쿼리스트링으로 CodeHub BE에 그대로 전달
    result = await client.proxy_request("POST", f"{BE_PATHS['manual_create']}?knox_id={knox_id}", token)
    # 성공 유저가 있으면 유저 캐시 무효화 (목록 새로고침 시 최신 데이터 반영)
    if result and result.get("count_is_success", 0) > 0:
        cache.invalidate(CACHE_KEYS["users"])
    return result


@router.patch("/users/{user_id}")
async def update_user(user_id: int, request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("PATCH", f"{BE_PATHS['users']}{user_id}/", token, body)
    cache.invalidate(CACHE_KEYS["users"])
    return result


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int, request: Request):
    token = get_token_from_request(request)
    await client.proxy_request("DELETE", f"{BE_PATHS['users']}{user_id}/", token)
    cache.invalidate(CACHE_KEYS["users"])


# ===== 그룹 API =====

@router.get("/groups")
async def list_groups(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    token = get_token_from_request(request)
    all_items = await _get_all("groups", token)
    if search:
        all_items = [g for g in all_items if search.lower() in g.get("group_name", "").lower()]
    effective_sort = sort_by if sort_by in _GROUP_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    all_items.sort(
        key=lambda g: g.get(effective_sort, 0) if effective_sort == "id"
                      else (g.get(effective_sort) or "").lower(),
        reverse=reverse,
    )
    return _paginate(all_items, page, page_size)


@router.get("/groups/{group_id}")
async def get_group(group_id: int, request: Request):
    token = get_token_from_request(request)
    return await client.proxy_request("GET", f"{BE_PATHS['groups']}{group_id}/", token)


@router.post("/groups", status_code=201)
async def create_group(request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("POST", BE_PATHS["groups"], token, body)
    cache.invalidate(CACHE_KEYS["groups"])
    return result


@router.patch("/groups/{group_id}")
async def update_group(group_id: int, request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("PATCH", f"{BE_PATHS['groups']}{group_id}/", token, body)
    cache.invalidate(CACHE_KEYS["groups"])
    return result


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(group_id: int, request: Request):
    token = get_token_from_request(request)
    await client.proxy_request("DELETE", f"{BE_PATHS['groups']}{group_id}/", token)
    cache.invalidate(CACHE_KEYS["groups"])


# ===== 권한 API =====

@router.get("/permissions")
async def list_permissions(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    token = get_token_from_request(request)
    all_items = await _get_all("permissions", token)
    if search:
        all_items = [p for p in all_items if search.lower() in p.get("permission_name", "").lower()]
    effective_sort = sort_by if sort_by in _PERMISSION_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    all_items.sort(
        key=lambda p: p.get(effective_sort, 0) if effective_sort == "id"
                      else (p.get(effective_sort) or "").lower(),
        reverse=reverse,
    )
    return _paginate(all_items, page, page_size)


@router.get("/permissions/{permission_id}")
async def get_permission(permission_id: int, request: Request):
    token = get_token_from_request(request)
    return await client.proxy_request("GET", f"{BE_PATHS['permissions']}{permission_id}/", token)


@router.post("/permissions", status_code=201)
async def create_permission(request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("POST", BE_PATHS["permissions"], token, body)
    cache.invalidate(CACHE_KEYS["permissions"])
    return result


@router.patch("/permissions/{permission_id}")
async def update_permission(permission_id: int, request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("PATCH", f"{BE_PATHS['permissions']}{permission_id}/", token, body)
    cache.invalidate(CACHE_KEYS["permissions"])
    return result


@router.delete("/permissions/{permission_id}", status_code=204)
async def delete_permission(permission_id: int, request: Request):
    token = get_token_from_request(request)
    await client.proxy_request("DELETE", f"{BE_PATHS['permissions']}{permission_id}/", token)
    cache.invalidate(CACHE_KEYS["permissions"])


# ===== 메뉴 API =====

@router.get("/menus")
async def list_menus(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    token = get_token_from_request(request)
    all_items = await _get_all("menus", token)
    if search:
        s = search.lower()
        all_items = [
            m for m in all_items
            if s in m.get("menu_name", "").lower() or s in m.get("permission_code", "").lower()
        ]
    effective_sort = sort_by if sort_by in _MENU_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    all_items.sort(
        key=lambda m: m.get(effective_sort, 0) if effective_sort == "id"
                      else (m.get(effective_sort) or "").lower(),
        reverse=reverse,
    )
    return _paginate(all_items, page, page_size)


@router.get("/menus/{menu_id}")
async def get_menu(menu_id: int, request: Request):
    token = get_token_from_request(request)
    return await client.proxy_request("GET", f"{BE_PATHS['menus']}{menu_id}/", token)


@router.post("/menus", status_code=201)
async def create_menu(request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("POST", BE_PATHS["menus"], token, body)
    cache.invalidate(CACHE_KEYS["menus"])
    return result


@router.patch("/menus/{menu_id}")
async def update_menu(menu_id: int, request: Request):
    token = get_token_from_request(request)
    body = await request.json()
    result = await client.proxy_request("PATCH", f"{BE_PATHS['menus']}{menu_id}/", token, body)
    cache.invalidate(CACHE_KEYS["menus"])
    return result


@router.delete("/menus/{menu_id}", status_code=204)
async def delete_menu(menu_id: int, request: Request):
    token = get_token_from_request(request)
    await client.proxy_request("DELETE", f"{BE_PATHS['menus']}{menu_id}/", token)
    cache.invalidate(CACHE_KEYS["menus"])
