codehub-rbac-model-api-spec.md
## 	문서 내용
- 현 문서는 기존 code hub Backend의 RBAC모델 스펙과 api spec, 기타 api스펙이 기술되어 있다.

## 배경
- 조인구조는 아래와 같다
    - user <-> group (many to many)
    - group <-> permission (many to many)
    - permssion <-> mernu (many to many)
- 컬럼 중 Create_time, update_time은 해당 백엔드에서 auto로 업데이트하는 컬럼이다
- {CodehubBe}로 API 요청 시, Header에 Authorization으로 “Bearer {token}”이 필요하다.  참고: codehub-idp-sso-spec.md


## 유저
- API: {CodehubBe}/api/v1/commons/users/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - user_id
    - full_name
    - employee_number
    - groups(join model id)
    - group_name(join model col)
- List action에서 search라는 키워드로 검색 Pram 지원함 (user_id 완전 일치 or full_name 완전 일치 여부 or departement_name 부분일치)
- 컬럼 리스트
    - id: int
    - ep_id: string
    - user_id: string
    - full_name: string
    - en_full_name: string
    - employee_number: string
    - grade_name: string
    - title_code: string
    - company_name: string
    - department_code: string
    - department_name: string
    - en_departement_name: string
    - create_time: string(iso 8601)
    - update_time: string(iso 8601)
    - groups: int(join model id)

## 그룹
- api: {CodehubBe}/api/v1/commons/group/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - group_name
    - permissions (join model id)
    - permission_name (join model col)
- 컬럼 리스트
"id": 1,
"group_name": "Admin",
"create_time": "2026-01-15T06:05:10.100203Z",
"update_time":"2026-01-15T06:05:10.100203Z",
"permissions": [ 33,34,35,37]

## 권한
- API: {CodehubBe}/api/v1/commons/permission/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - permission_name
    - menus (join model id)
    - menu_name (join model col)
    - permission_code (join model col)
- 컬럼 리스트
"id": 1,
"permission_name": "HomeMenuPermission",
"create_time": "2026-01-15T06:05:10.100203Z",
"update_time":"2026-01-15T06:05:10.100203Z",
"menus": [2]

## 메뉴
- API: {CodehubBe}/api/v1/commons/menu/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - menu_name
    - permission_code
- 컬럼 리스트
"id": 1,
"menu_name": "홈페이지",
“permission_code":"PortalHome"


## 기타 api
- 가능한 권한 List
- API: {CodeHubBe}/api/v1/auths/accessible-permission-info/
- 응답:
    - {“permission_name": "~~"} 의 리스트 형태
- 로그인 이후 헤더에 new_token을 포함하여 보내면 가능한 권한 목록을 모두 보내준다.
- 이 때 해당 응답의 permission_name 중 “CodeHubRbacManage” 가 있어야 모든 기능을 이용할 수 있다.

