"""Dummy 모드용 인메모리 Mock 데이터"""

from datetime import datetime, timezone

_now = datetime.now(timezone.utc).isoformat()

# --- 메뉴 ---
MENUS: list[dict] = [
    {"id": 1, "menu_name": "홈페이지", "permission_code": "PortalHome"},
    {"id": 2, "menu_name": "대시보드", "permission_code": "Dashboard"},
    {"id": 3, "menu_name": "프로젝트 관리", "permission_code": "ProjectManage"},
    {"id": 4, "menu_name": "코드 리뷰", "permission_code": "CodeReview"},
    {"id": 5, "menu_name": "CI/CD 파이프라인", "permission_code": "CiCdPipeline"},
    {"id": 6, "menu_name": "모니터링", "permission_code": "Monitoring"},
    {"id": 7, "menu_name": "설정", "permission_code": "Settings"},
    {"id": 8, "menu_name": "사용자 관리", "permission_code": "UserManage"},
    {"id": 9, "menu_name": "RBAC 관리", "permission_code": "CodeHubRbacManage"},
    {"id": 10, "menu_name": "API 문서", "permission_code": "ApiDocs"},
]

# --- 권한 ---
PERMISSIONS: list[dict] = [
    {"id": 1, "permission_name": "HomeMenuPermission", "create_time": _now, "update_time": _now, "menus": [1]},
    {"id": 2, "permission_name": "DashboardPermission", "create_time": _now, "update_time": _now, "menus": [2]},
    {"id": 3, "permission_name": "ProjectPermission", "create_time": _now, "update_time": _now, "menus": [3, 4]},
    {"id": 4, "permission_name": "DevOpsPermission", "create_time": _now, "update_time": _now, "menus": [5, 6]},
    {"id": 5, "permission_name": "AdminPermission", "create_time": _now, "update_time": _now, "menus": [7, 8, 9]},
    {"id": 6, "permission_name": "CodeHubRbacManage", "create_time": _now, "update_time": _now, "menus": [9]},
    {"id": 7, "permission_name": "ApiDocsPermission", "create_time": _now, "update_time": _now, "menus": [10]},
    {"id": 8, "permission_name": "FullAccessPermission", "create_time": _now, "update_time": _now, "menus": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]},
]

# --- 그룹 ---
GROUPS: list[dict] = [
    {"id": 1, "group_name": "Admin", "create_time": _now, "update_time": _now, "permissions": [1, 2, 3, 4, 5, 6, 7, 8]},
    {"id": 2, "group_name": "Developer", "create_time": _now, "update_time": _now, "permissions": [1, 2, 3, 4, 7]},
    {"id": 3, "group_name": "DevOps", "create_time": _now, "update_time": _now, "permissions": [1, 2, 4, 7]},
    {"id": 4, "group_name": "Viewer", "create_time": _now, "update_time": _now, "permissions": [1, 2]},
    {"id": 5, "group_name": "defaultUser", "create_time": _now, "update_time": _now, "permissions": [1]},
]

# --- 유저 (샘플 30명) ---
_departments = ["플랫폼개발팀", "서비스개발팀", "인프라팀", "QA팀", "기획팀", "디자인팀"]
_grades = ["사원", "대리", "과장", "차장", "부장"]

def _generate_users() -> list[dict]:
    """샘플 유저 30명 생성"""
    users = []
    names_kr = [
        ("홍길동", "Gil-Dong Hong"), ("김철수", "Chul-Su Kim"), ("이영희", "Young-Hee Lee"),
        ("박민수", "Min-Su Park"), ("정수연", "Su-Yeon Jeong"), ("최준호", "Jun-Ho Choi"),
        ("강서윤", "Seo-Yun Kang"), ("윤하늘", "Ha-Neul Yun"), ("장도현", "Do-Hyun Jang"),
        ("임지원", "Ji-Won Lim"), ("한소희", "So-Hee Han"), ("오세진", "Se-Jin Oh"),
        ("신동욱", "Dong-Wook Shin"), ("류현진", "Hyun-Jin Ryu"), ("배수지", "Su-Ji Bae"),
        ("조민기", "Min-Ki Cho"), ("권나영", "Na-Young Kwon"), ("서태웅", "Tae-Woong Seo"),
        ("문재인", "Jae-In Moon"), ("양세형", "Se-Hyung Yang"), ("손흥민", "Heung-Min Son"),
        ("김연아", "Yuna Kim"), ("이승기", "Seung-Gi Lee"), ("전지현", "Ji-Hyun Jeon"),
        ("고윤정", "Yun-Jung Go"), ("남주혁", "Joo-Hyuk Nam"), ("유재석", "Jae-Suk Yoo"),
        ("하정우", "Jung-Woo Ha"), ("차은우", "Eun-Woo Cha"), ("노홍철", "Hong-Chul Noh"),
    ]

    for i, (kr_name, en_name) in enumerate(names_kr, start=1):
        # user_id: 영문 이름 기반
        parts = en_name.lower().replace("-", "").split()
        user_id = f"{parts[-1]}.{parts[0][:2]}"

        dept_idx = (i - 1) % len(_departments)
        grade_idx = (i - 1) % len(_grades)

        # 모든 유저가 defaultUser(5) 그룹에 속하고, 일부는 추가 그룹 보유
        groups = [5]
        if i <= 3:
            groups = [1, 5]  # Admin
        elif i <= 10:
            groups = [2, 5]  # Developer
        elif i <= 15:
            groups = [3, 5]  # DevOps
        elif i <= 20:
            groups = [4, 5]  # Viewer

        users.append({
            "id": i,
            "ep_id": f"EP{str(i).zfill(5)}",
            "user_id": user_id,
            "full_name": kr_name,
            "en_full_name": en_name,
            "employee_number": f"EMP{str(1000 + i)}",
            "grade_name": _grades[grade_idx],
            "title_code": None,
            "company_name": "CodeHub Inc.",
            "department_code": f"D{str(dept_idx + 1).zfill(3)}",
            "department_name": _departments[dept_idx],
            "en_department_name": f"Dept_{dept_idx + 1}",
            "create_time": _now,
            "update_time": _now,
            "groups": groups,
        })

    return users


USERS: list[dict] = _generate_users()

# 자동 증가 ID 추적용
NEXT_IDS = {
    "users": len(USERS) + 1,
    "groups": len(GROUPS) + 1,
    "permissions": len(PERMISSIONS) + 1,
    "menus": len(MENUS) + 1,
}
