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
    ManualCreateResponse,
)
from app.mock.data import USERS, GROUPS, PERMISSIONS, MENUS, NEXT_IDS

router = APIRouter(prefix="/api/v1")

# 각 엔티티 목록 정렬 허용 필드 (화이트리스트 — 임의 필드명 injection 방지)
_USER_SORT_FIELDS = {"id", "full_name", "user_id", "department_name", "department_code", "create_time", "update_time"}
_GROUP_SORT_FIELDS = {"id", "group_name", "create_time", "update_time"}
_PERMISSION_SORT_FIELDS = {"id", "permission_name", "create_time", "update_time"}
_MENU_SORT_FIELDS = {"id", "menu_name", "permission_code", "create_time", "update_time"}


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
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    filtered = USERS[:]

    # 그룹 필터
    if group_filter is not None:
        filtered = [u for u in filtered if group_filter in u["groups"]]

    # 검색: user_id/full_name 완전 일치, department_name 부분 일치, department_code 완전 일치
    if search:
        filtered = [
            u for u in filtered
            if u["user_id"] == search
            or u["full_name"] == search
            or search in (u.get("department_name") or "")
            or u.get("department_code") == search
        ]

    # 정렬: 허용된 필드만 사용, 기본값 id desc
    effective_sort = sort_by if sort_by in _USER_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    filtered.sort(
        key=lambda u: u.get(effective_sort, 0) if effective_sort == "id"
                      else (u.get(effective_sort) or "").lower(),
        reverse=reverse,
    )

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


@router.post("/users/manual-create")
async def manual_create_users(knox_id: str = Query(...)):
    """Knox ID 일괄 생성 Mock — 기존 Mock 유저 user_id와 일치하면 성공, 아니면 not_found로 처리"""
    # 쿼리 파라미터로 받은 comma-separated Knox ID 파싱 (공백 제거)
    knox_ids = [kid.strip() for kid in knox_id.split(",") if kid.strip()]

    # Mock 로직: 기존 USERS에 존재하는 user_id면 이미 등록된 것이므로 성공 처리,
    # 존재하지 않으면 "test"로 시작하면 not_found, 그 외에는 새 유저로 생성하여 성공
    existing_ids = {u["user_id"] for u in USERS}
    success_ids: list[str] = []
    not_found_ids: list[str] = []

    for kid in knox_ids:
        if kid.startswith("test"):
            # "test"로 시작하는 ID는 Knox에서 미발견된 것으로 Mock 처리
            not_found_ids.append(kid)
        else:
            # 실제로 Mock 유저를 생성
            if kid not in existing_ids:
                new_user = {
                    "id": NEXT_IDS["users"],
                    "ep_id": f"EP{str(NEXT_IDS['users']).zfill(5)}",
                    "user_id": kid,
                    "full_name": None,
                    "en_full_name": None,
                    "employee_number": None,
                    "grade_name": None,
                    "title_code": None,
                    "company_name": None,
                    "department_code": None,
                    "department_name": None,
                    "en_department_name": None,
                    "create_time": _now_iso(),
                    "update_time": _now_iso(),
                    "groups": [],
                }
                NEXT_IDS["users"] += 1
                USERS.append(new_user)
            success_ids.append(kid)

    return ManualCreateResponse(
        count_is_success=len(success_ids),
        count_is_not_found=len(not_found_ids),
        count_is_internal_server_error=0,
        success_user_ids=success_ids,
        not_found_user_ids=not_found_ids,
        internal_server_error_user_ids=[],
    )


# ===== 그룹 API =====

@router.get("/groups")
async def list_groups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    filtered = GROUPS[:]
    if search:
        filtered = [g for g in filtered if search.lower() in g["group_name"].lower()]
    effective_sort = sort_by if sort_by in _GROUP_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    filtered.sort(
        key=lambda g: g.get(effective_sort, 0) if effective_sort == "id"
                      else (g.get(effective_sort) or "").lower(),
        reverse=reverse,
    )
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
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    filtered = PERMISSIONS[:]
    if search:
        filtered = [p for p in filtered if search.lower() in p["permission_name"].lower()]
    effective_sort = sort_by if sort_by in _PERMISSION_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    filtered.sort(
        key=lambda p: p.get(effective_sort, 0) if effective_sort == "id"
                      else (p.get(effective_sort) or "").lower(),
        reverse=reverse,
    )
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
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    filtered = MENUS[:]
    if search:
        search_lower = search.lower()
        filtered = [
            m for m in filtered
            if search_lower in m["menu_name"].lower()
            or search_lower in m["permission_code"].lower()
        ]
    effective_sort = sort_by if sort_by in _MENU_SORT_FIELDS else "id"
    reverse = (sort_order or "desc") != "asc"
    filtered.sort(
        key=lambda m: m.get(effective_sort, 0) if effective_sort == "id"
                      else (m.get(effective_sort) or "").lower(),
        reverse=reverse,
    )
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
        "create_time": _now_iso(),
        "update_time": _now_iso(),
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
            menu["update_time"] = _now_iso()
            return menu
    raise HTTPException(status_code=404, detail="Menu not found")


@router.delete("/menus/{menu_id}", status_code=204)
async def delete_menu(menu_id: int):
    for i, menu in enumerate(MENUS):
        if menu["id"] == menu_id:
            MENUS.pop(i)
            return
    raise HTTPException(status_code=404, detail="Menu not found")
