from pydantic import BaseModel
from typing import Optional


# --- 페이지네이션 응답 ---

class PaginatedResponse(BaseModel):
    """FastAPI가 FE에 제공하는 페이지네이션 응답"""
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


# --- 유저 ---

class UserBase(BaseModel):
    ep_id: str                                    # 필수 (Django: not null, not blank)
    user_id: str                                  # 필수 (Django: not null, not blank, unique)
    full_name: Optional[str] = None               # nullable (Django: null=True) — null 가능, "" 불가
    en_full_name: Optional[str] = None
    employee_number: Optional[str] = None
    grade_name: Optional[str] = None
    title_code: Optional[str] = None
    company_name: Optional[str] = None
    department_code: Optional[str] = None
    department_name: Optional[str] = None
    en_department_name: Optional[str] = None


class UserCreate(UserBase):
    groups: list[int] = []


class UserUpdate(BaseModel):
    ep_id: Optional[str] = None
    user_id: Optional[str] = None
    full_name: Optional[str] = None
    en_full_name: Optional[str] = None
    employee_number: Optional[str] = None
    grade_name: Optional[str] = None
    title_code: Optional[str] = None
    company_name: Optional[str] = None
    department_code: Optional[str] = None
    department_name: Optional[str] = None
    en_department_name: Optional[str] = None
    groups: Optional[list[int]] = None


class UserResponse(UserBase):
    id: int
    create_time: Optional[str] = None
    update_time: Optional[str] = None
    groups: list[int] = []


# --- 그룹 ---

class GroupBase(BaseModel):
    group_name: str


class GroupCreate(GroupBase):
    permissions: list[int] = []


class GroupUpdate(BaseModel):
    group_name: Optional[str] = None
    permissions: Optional[list[int]] = None


class GroupResponse(GroupBase):
    id: int
    create_time: Optional[str] = None
    update_time: Optional[str] = None
    permissions: list[int] = []


# --- 권한 ---

class PermissionBase(BaseModel):
    permission_name: str


class PermissionCreate(PermissionBase):
    menus: list[int] = []


class PermissionUpdate(BaseModel):
    permission_name: Optional[str] = None
    menus: Optional[list[int]] = None


class PermissionResponse(PermissionBase):
    id: int
    create_time: Optional[str] = None
    update_time: Optional[str] = None
    menus: list[int] = []


# --- 메뉴 ---

class MenuBase(BaseModel):
    menu_name: str
    permission_code: str


class MenuCreate(MenuBase):
    pass


class MenuUpdate(BaseModel):
    menu_name: Optional[str] = None
    permission_code: Optional[str] = None


class MenuResponse(MenuBase):
    id: int


# --- 인증 ---

class AccessiblePermission(BaseModel):
    permission_name: str
