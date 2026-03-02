"""Dummy 모드용 Mock CRUD 라우터

CodeHub BE가 없는 사외망 환경에서 인메모리 데이터로 전체 CRUD를 처리한다.
"""

import math
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.schemas import (
    UserCreate, UserUpdate, UserResponse,
    GroupCreate, GroupUpdate, GroupResponse,
    PermissionCreate, PermissionUpdate, PermissionResponse,
    MenuCreate, MenuUpdate, MenuResponse,
    PaginatedResponse,
)
from app.mock.data import USERS, GROUPS, PERMISSIONS, MENUS, NEXT_IDS

router = APIRouter(prefix="/api/v1")


# --- 페이지네이션/검색 헬퍼 ---

def _paginate(items: list, page: int, page_size: int) -> PaginatedResponse:
    """리스트를 페이지네이션하여 반환"""
    total = len(items)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    start = (page - 1) * page_size
    end = start + page_size
    return PaginatedResponse(
        items=items[start:end],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ===== 유저 API =====

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    group_filter: Optional[int] = None,
):
    filtered = USERS[:]

    # 그룹 필터
    if group_filter is not None:
        filtered = [u for u in filtered if group_filter in u["groups"]]

    # 검색: user_id 완전 일치 OR full_name 완전 일치 OR department_name 부분 일치
    if search:
        filtered = [
            u for u in filtered
            if u["user_id"] == search
            or u["full_name"] == search
            or search in u.get("department_name", "")
        ]

    return _paginate(filtered, page, page_size)


@router.get("/users/{user_id}")
async def get_user(user_id: int):
    for user in USERS:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")


@router.post("/users", status_code=201)
async def create_user(data: UserCreate):
    new_user = {
        "id": NEXT_IDS["users"],
        **data.model_dump(),
        "create_time": _now_iso(),
        "update_time": _now_iso(),
    }
    NEXT_IDS["users"] += 1
    USERS.append(new_user)
    return new_user


@router.patch("/users/{user_id}")
async def update_user(user_id: int, data: UserUpdate):
    for user in USERS:
        if user["id"] == user_id:
            update_data = data.model_dump(exclude_unset=True)
            user.update(update_data)
            user["update_time"] = _now_iso()
            return user
    raise HTTPException(status_code=404, detail="User not found")


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int):
    for i, user in enumerate(USERS):
        if user["id"] == user_id:
            USERS.pop(i)
            return
    raise HTTPException(status_code=404, detail="User not found")


# ===== 그룹 API =====

@router.get("/groups")
async def list_groups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    filtered = GROUPS[:]
    if search:
        filtered = [g for g in filtered if search.lower() in g["group_name"].lower()]
    return _paginate(filtered, page, page_size)


@router.get("/groups/{group_id}")
async def get_group(group_id: int):
    for group in GROUPS:
        if group["id"] == group_id:
            return group
    raise HTTPException(status_code=404, detail="Group not found")


@router.post("/groups", status_code=201)
async def create_group(data: GroupCreate):
    new_group = {
        "id": NEXT_IDS["groups"],
        **data.model_dump(),
        "create_time": _now_iso(),
        "update_time": _now_iso(),
    }
    NEXT_IDS["groups"] += 1
    GROUPS.append(new_group)
    return new_group


@router.patch("/groups/{group_id}")
async def update_group(group_id: int, data: GroupUpdate):
    for group in GROUPS:
        if group["id"] == group_id:
            update_data = data.model_dump(exclude_unset=True)
            group.update(update_data)
            group["update_time"] = _now_iso()
            return group
    raise HTTPException(status_code=404, detail="Group not found")


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(group_id: int):
    for i, group in enumerate(GROUPS):
        if group["id"] == group_id:
            GROUPS.pop(i)
            return
    raise HTTPException(status_code=404, detail="Group not found")


# ===== 권한 API =====

@router.get("/permissions")
async def list_permissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    filtered = PERMISSIONS[:]
    if search:
        filtered = [p for p in filtered if search.lower() in p["permission_name"].lower()]
    return _paginate(filtered, page, page_size)


@router.get("/permissions/{permission_id}")
async def get_permission(permission_id: int):
    for perm in PERMISSIONS:
        if perm["id"] == permission_id:
            return perm
    raise HTTPException(status_code=404, detail="Permission not found")


@router.post("/permissions", status_code=201)
async def create_permission(data: PermissionCreate):
    new_perm = {
        "id": NEXT_IDS["permissions"],
        **data.model_dump(),
        "create_time": _now_iso(),
        "update_time": _now_iso(),
    }
    NEXT_IDS["permissions"] += 1
    PERMISSIONS.append(new_perm)
    return new_perm


@router.patch("/permissions/{permission_id}")
async def update_permission(permission_id: int, data: PermissionUpdate):
    for perm in PERMISSIONS:
        if perm["id"] == permission_id:
            update_data = data.model_dump(exclude_unset=True)
            perm.update(update_data)
            perm["update_time"] = _now_iso()
            return perm
    raise HTTPException(status_code=404, detail="Permission not found")


@router.delete("/permissions/{permission_id}", status_code=204)
async def delete_permission(permission_id: int):
    for i, perm in enumerate(PERMISSIONS):
        if perm["id"] == permission_id:
            PERMISSIONS.pop(i)
            return
    raise HTTPException(status_code=404, detail="Permission not found")


# ===== 메뉴 API =====

@router.get("/menus")
async def list_menus(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    filtered = MENUS[:]
    if search:
        search_lower = search.lower()
        filtered = [
            m for m in filtered
            if search_lower in m["menu_name"].lower()
            or search_lower in m["permission_code"].lower()
        ]
    return _paginate(filtered, page, page_size)


@router.get("/menus/{menu_id}")
async def get_menu(menu_id: int):
    for menu in MENUS:
        if menu["id"] == menu_id:
            return menu
    raise HTTPException(status_code=404, detail="Menu not found")


@router.post("/menus", status_code=201)
async def create_menu(data: MenuCreate):
    new_menu = {
        "id": NEXT_IDS["menus"],
        **data.model_dump(),
    }
    NEXT_IDS["menus"] += 1
    MENUS.append(new_menu)
    return new_menu


@router.patch("/menus/{menu_id}")
async def update_menu(menu_id: int, data: MenuUpdate):
    for menu in MENUS:
        if menu["id"] == menu_id:
            update_data = data.model_dump(exclude_unset=True)
            menu.update(update_data)
            return menu
    raise HTTPException(status_code=404, detail="Menu not found")


@router.delete("/menus/{menu_id}", status_code=204)
async def delete_menu(menu_id: int):
    for i, menu in enumerate(MENUS):
        if menu["id"] == menu_id:
            MENUS.pop(i)
            return
    raise HTTPException(status_code=404, detail="Menu not found")
