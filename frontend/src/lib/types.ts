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
