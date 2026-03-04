// --- 페이지네이션 ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// --- 유저 ---

export interface User {
  id: number;
  ep_id: string;
  user_id: string;
  full_name: string | null;           // nullable (Django: null=True)
  en_full_name: string | null;
  employee_number: string | null;
  grade_name: string | null;
  title_code: string | null;
  company_name: string | null;
  department_code: string | null;
  department_name: string | null;
  en_department_name: string | null;
  create_time: string;
  update_time: string;
  groups: number[];
}

export interface UserCreate {
  ep_id: string;                      // required (Django: not null, not blank)
  user_id: string;
  full_name?: string | null;          // nullable — null 가능, "" 불가
  en_full_name?: string | null;
  employee_number?: string | null;
  grade_name?: string | null;
  title_code?: string | null;
  company_name?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  en_department_name?: string | null;
  groups?: number[];
}

export interface UserUpdate {
  ep_id?: string;
  user_id?: string;
  full_name?: string | null;          // nullable — null 가능, "" 불가
  en_full_name?: string | null;
  employee_number?: string | null;
  grade_name?: string | null;
  title_code?: string | null;
  company_name?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  en_department_name?: string | null;
  groups?: number[];
}

// --- Knox 일괄 생성 ---

export interface ManualCreateRequest {
  knox_ids: string; // comma-separated Knox ID (최대 100명)
}

export interface ManualCreateResponse {
  count_is_success: number;
  count_is_not_found: number;
  count_is_internal_server_error: number;
  success_user_ids: string[];
  not_found_user_ids: string[];
  internal_server_error_user_ids: string[];
}

// --- 그룹 ---

export interface Group {
  id: number;
  group_name: string;
  create_time: string;
  update_time: string;
  permissions: number[];
}

export interface GroupCreate {
  group_name: string;
  permissions?: number[];
}

export interface GroupUpdate {
  group_name?: string;
  permissions?: number[];
}

// --- 권한 ---

export interface Permission {
  id: number;
  permission_name: string;
  create_time: string;
  update_time: string;
  menus: number[];
}

export interface PermissionCreate {
  permission_name: string;
  menus?: number[];
}

export interface PermissionUpdate {
  permission_name?: string;
  menus?: number[];
}

// --- 메뉴 ---

export interface Menu {
  id: number;
  menu_name: string;
  permission_code: string;
  create_time: string;
  update_time: string;
}

export interface MenuCreate {
  menu_name: string;
  permission_code: string;
}

export interface MenuUpdate {
  menu_name?: string;
  permission_code?: string;
}

// --- 인증 ---

export interface AccessiblePermission {
  permission_name: string;
}
