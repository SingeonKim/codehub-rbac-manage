codehub-rbac-model-api-spec.md
## 	문서 내용
- 현 문서는 기존 code hub Backend의 RBAC모델 스펙과 api spec, 기타 api스펙이 기술되어 있다.

## 배경
- 조인구조는 아래와 같다
    - user <-> group (many to many)
    - group <-> permission (many to many)
    - permssion <-> mernu (many to many)
- 컬럼 중 Create_time, update_time은 해당 백엔드에서 auto로 업데이트하는 컬럼이다
- {CodehubBe}로 API 요청 시, Header에 Authorization으로 "Bearer {token}"이 필요하다.  참고: codehub-idp-sso-spec.md

### 필드 제약조건 규칙
- **required (not null, not blank)**: 비어있으면 안 되는 필수 필드. `null`과 `""` 모두 거부
- **nullable (null=True, blank 없음)**: 값이 없을 때 `null`을 전송해야 함. `""` (빈 문자열)을 보내면 validation error 발생
- **M2M (blank=True)**: 빈 배열 `[]` 전송 가능
- **auto**: 서버에서 자동 관리 (create_time, update_time)


## 유저
- API: {CodehubBe}/api/v1/commons/user/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - user_id
    - full_name
    - employee_number
    - groups(join model id)
    - group_name(join model col)
- List action에서 search라는 키워드로 검색 Pram 지원함 (user_id 완전 일치 or full_name 완전 일치 여부 or departement_name 부분일치)
- 컬럼 리스트

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | int | auto (PK) | |
| ep_id | string | **required** | 임직원 고유 ID |
| user_id | string | **required**, unique | knox ID |
| full_name | string | **nullable** | 이름 |
| en_full_name | string | **nullable** | 이름(영문) |
| employee_number | string | **nullable** | 사번 |
| grade_name | string | **nullable** | 직책 |
| title_code | string | **nullable** | Career Level |
| company_name | string | **nullable** | 회사명 |
| department_code | string | **nullable** | 부서 코드 |
| department_name | string | **nullable** | 부서명 |
| en_department_name | string | **nullable** | 부서명(영문) |
| create_time | string (ISO 8601) | auto | 생성일시 |
| update_time | string (ISO 8601) | auto | 수정일시 |
| groups | int[] | M2M (blank=True) | 소속 그룹 ID 목록 |

## 그룹
- api: {CodehubBe}/api/v1/commons/group/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - group_name
    - permissions (join model id)
    - permission_name (join model col)
- 컬럼 리스트

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | int | auto (PK) | |
| group_name | string | **required** | 그룹 이름 |
| create_time | string (ISO 8601) | auto | 생성일시 |
| update_time | string (ISO 8601) | auto | 수정일시 |
| permissions | int[] | M2M (blank=True) | 권한 ID 목록 |

## 권한
- API: {CodehubBe}/api/v1/commons/permission/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - permission_name
    - menus (join model id)
    - menu_name (join model col)
    - permission_code (join model col)
- 컬럼 리스트

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | int | auto (PK) | |
| permission_name | string | **required** | 권한 이름 |
| create_time | string (ISO 8601) | auto | 생성일시 |
| update_time | string (ISO 8601) | auto | 수정일시 |
| menus | int[] | M2M (blank=True) | 메뉴 ID 목록 |

## 메뉴
- API: {CodehubBe}/api/v1/commons/menu/
- List Action에서 다음 컬럼에 대해 Comma-separated Query Param지원
    - id
    - menu_name
    - permission_code
- 컬럼 리스트

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | int | auto (PK) | |
| menu_name | string | **required** | 메뉴 이름 |
| permission_code | string | **required**, unique | 프론트에서 사용하는 권한 관리용 Text Key |
| parent_menu | int | **nullable** (FK, 자기참조) | 부모 메뉴 ID (null이면 최상위) |
| create_time | string (ISO 8601) | auto | 생성일시 |
| update_time | string (ISO 8601) | auto | 수정일시 |


## 기타 api
- 가능한 권한 List
- API: {CodeHubBe}/api/v1/auths/accessible-permission-info/
- 응답:
    - {"permission_name": "~~"} 의 리스트 형태
- 로그인 이후 헤더에 new_token을 포함하여 보내면 가능한 권한 목록을 모두 보내준다.
- 이 때 해당 응답의 permission_name 중 "CodeHubRbacManage" 가 있어야 모든 기능을 이용할 수 있다.
