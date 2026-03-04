# CodeHub RBAC Manage - 요구사항 정의서

> 작성일: 2026-03-02
> 버전: 1.0 (초안)

---

## 1. 프로젝트 개요

### 1.1 목적

CodeHub 서비스의 RBAC(역할 기반 접근 제어)를 관리하는 독립 웹 마이크로서비스를 구축한다.
기존 CodeHub 백엔드에 구축된 RBAC 모델(유저, 그룹, 권한, 메뉴)의 CRUD API를 활용하여, 관리자가 직관적으로 RBAC을 제어할 수 있는 웹 UI를 제공한다.

### 1.2 범위

- 유저, 그룹, 권한, 메뉴의 조회/생성/수정/삭제
- 엔티티 간 M:M 관계 관리 (유저-그룹, 그룹-권한, 권한-메뉴)
- 사내 SSO(OIDC) 연동 인증
- 사외망 개발을 위한 Dummy 모드 제공

### 1.3 범위 외

- RBAC 모델 자체의 DB 스키마 변경 (기존 CodeHub BE가 담당)
- 본 서비스 자체의 DB 구축 (CodeHub BE API를 프록시하여 사용)

### 1.4 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react |
| 백엔드 | FastAPI (Python) |
| 인증 | OIDC 기반 사내 SSO + JWT |
| 외부 연동 | CodeHub Backend REST API (DRF 기반) |

### 1.5 용어 정의

| 용어 | 설명 |
|------|------|
| CodeHub BE | 기존 CodeHub 서비스의 백엔드 (DRF 기반, RBAC 모델과 API를 보유) |
| IdP | 사내 Identity Provider (OIDC 프로토콜 지원) |
| RBAC | Role-Based Access Control. 본 프로젝트에서는 User-Group-Permission-Menu 4계층 구조 |
| Dummy 모드 | 사외망 개발 시 CodeHub BE와 IdP 없이 Mock 데이터로 동작하는 모드 |
| ep_id | IdP에서 발급하는 사용자 고유 식별자 (employee ID 기반) |

---

## 2. 시스템 구성

### 2.1 아키텍처 개요

```
[사용자 브라우저]
      │
      ▼
[Next.js 15 Frontend]  ── SSR/CSR ──
      │
      ▼
[FastAPI Backend]  ── 프록시 + 인증 처리 ──
      │                         │
      ▼                         ▼
[CodeHub BE (DRF)]        [사내 IdP (OIDC)]
```

### 2.2 각 계층의 역할

| 계층 | 역할 |
|------|------|
| **Next.js Frontend** | UI 렌더링, 사용자 인터랙션 처리, FastAPI로 API 요청 |
| **FastAPI Backend** | CodeHub BE 데이터 캐싱/페이지네이션/필터링 레이어, SSO 인증 처리, Dummy 모드 Mock API 제공 |
| **CodeHub BE** | RBAC 데이터의 실제 CRUD 처리, 데이터 영속성 |
| **사내 IdP** | OIDC 기반 사용자 인증, id_token 발급 |

### 2.3 통신 흐름

- **일반 모드**: Next.js → FastAPI → CodeHub BE (FastAPI가 Authorization 헤더를 전달하여 프록시)
- **Dummy 모드**: Next.js → FastAPI (FastAPI 자체에서 Mock 데이터 반환, CodeHub BE 호출 안 함)

### 2.4 알려진 제약사항 및 대응 전략

#### 제약: CodeHub BE에 페이지네이션 미구현

CodeHub BE의 List API는 페이지네이션을 지원하지 않으며, 호출 시 해당 엔티티의 **전체 데이터**를 반환한다.

**데이터 규모 추정:**

| 엔티티 | 예상 규모 | 영향도 |
|--------|----------|--------|
| User | 4,000~5,000건 | **높음** - 전체 로딩 시 응답 크기 및 FE 렌더링 부하 |
| Group | 수십 건 | 낮음 |
| Permission | 수십 건 | 낮음 |
| Menu | 수십 건 | 낮음 |

#### 대응 전략: FastAPI 데이터 레이어

FastAPI를 단순 프록시가 아닌 **캐싱 + 페이지네이션 + 검색/필터링을 제공하는 데이터 레이어**로 활용한다.

```
[Next.js FE] → 페이지네이션 요청 (page, page_size, search, filters)
     │
     ▼
[FastAPI] ← 인메모리 캐시에서 필터링/페이지네이션 처리 후 응답
     │
     ▼ (캐시 미스 또는 갱신 시에만)
[CodeHub BE] ← 전체 데이터 fetch
```

**FastAPI 캐싱 정책:**

| 항목 | 정책 |
|------|------|
| 캐시 저장 방식 | 인메모리 (dict 또는 간단한 캐시 구조) |
| 캐시 TTL | 엔티티별로 설정 (User: 5분, Group/Permission/Menu: 10분 등) |
| 캐시 무효화 | CUD(생성/수정/삭제) 요청 시 해당 엔티티 캐시 즉시 무효화 |
| 초기 로딩 | 첫 요청 시 CodeHub BE에서 전체 fetch 후 캐시 |

**FastAPI가 FE에 제공하는 페이지네이션 응답 형식:**
```json
{
  "items": [...],
  "total": 4523,
  "page": 1,
  "page_size": 20,
  "total_pages": 227
}
```

#### 특수 케이스: defaultUser 그룹

`defaultUser` 그룹은 전체 유저(4,000~5,000명)가 소속되는 그룹으로, 이 그룹으로 필터링하면 사실상 전체 유저 조회와 동일하다.

**대응:**
- FE에서 그룹 필터 드롭다운에 `defaultUser` 그룹을 **제외하거나 비활성 표시** (선택 시 "전체 유저가 포함된 그룹입니다" 안내)
- 또는 FastAPI 설정으로 대용량 그룹 ID 목록을 관리하여, 해당 그룹 필터 시 필터 없이 전체 목록(페이지네이션 적용)을 반환

---

## 3. 인증/인가

### 3.1 SSO 인증 흐름 (일반 모드)

```
1. [FE] 로그인 버튼 클릭 → [FastAPI] GET /api/auth/sso 요청
2. [FastAPI] IdP 인증 URL 생성 → 302 Redirect to IdP
3. [사용자] IdP 로그인 페이지에서 사내 계정으로 로그인
4. [IdP] → [FastAPI] POST /api/auth/acs (form_post로 id_token 전달)
5. [FastAPI] .cer 공개키로 id_token 검증 (RS256)
6. [FastAPI] id_token에서 userid 추출 → ep_id로 저장
7. [FastAPI] 자체 JWT 생성:
   - payload: { sub: "Access-Token", epid: <ep_id>, iat: <timestamp>, exp: <+12시간> }
   - 서명: HS256 + SECRET_KEY
8. [FastAPI] → 302 Redirect to [FE] /auth?token=<jwt>
9. [FE] URL에서 token 추출 → 로컬 저장 (cookie 또는 localStorage)
10. [FE] 이후 모든 API 요청 시 Authorization: Bearer <token> 헤더 포함
```

### 3.2 SSO 인증 흐름 (Dummy 모드)

```
1. [FE] 로그인 버튼 클릭 → [FastAPI] GET /api/auth/sso 요청
2. [FastAPI] IdP 호출 없이, 미리 정의된 Dummy 사용자 정보로 JWT 즉시 생성
3. [FastAPI] → 302 Redirect to [FE] /auth?token=<jwt>
4. 이후 동일
```

### 3.3 인가 (권한 체크)

- 로그인 후 `/auth` 콜백 페이지에서 `GET /api/auth/accessible-permissions` 호출
- 응답의 permission_name 목록에 `"CodeHubRbacManage"`가 포함되어야 서비스 이용 가능
- **Dummy 모드**: 항상 `CodeHubRbacManage` 권한 포함하여 응답

#### 권한 확인 결과에 따른 처리

| 결과 | 동작 |
|------|------|
| 권한 있음 | localStorage에 `codehub_rbac_access` 플래그 저장 → 대시보드로 이동 |
| 권한 없음 | localStorage 토큰 즉시 삭제 → 접근 불가 안내 화면 표시 |
| API 오류 | localStorage 토큰 즉시 삭제 → 오류 안내 화면 표시 |

- **권한 없는 경우 토큰 삭제 필수**: 토큰이 남아있으면 로그인 페이지 접근 시 대시보드로 튕기는 문제가 발생하므로, 권한 없음 확인 즉시 토큰을 삭제한다.
- **"로그인 페이지로 돌아가기"**: 클릭 시 토큰이 이미 삭제된 상태이므로 정상적으로 로그인 화면이 표시된다.

#### 보호된 레이아웃(`(main)/layout.tsx`)에서의 재검증

인증된 사용자가 직접 URL로 접근하는 경우에도 권한을 재검증한다.

| 상태 | 동작 |
|------|------|
| 토큰 없음 또는 만료 | `/login`으로 리다이렉트 |
| 토큰 있음 + `codehub_rbac_access` 플래그 없음 | 토큰 삭제 후 `/login`으로 리다이렉트 |
| 토큰 있음 + 플래그 있음 | 정상 렌더링 |

- `codehub_rbac_access` 플래그는 토큰과 동일한 생명주기로 관리된다.
  - 권한 확인 성공 시 저장, 토큰 삭제(`removeToken()`) 시 함께 삭제된다.

### 3.4 토큰 관리

| 항목 | 내용 |
|------|------|
| 저장 위치 | FE에서 cookie 또는 localStorage |
| 만료 시간 | 발급 후 12시간 |
| 만료 시 동작 | 로그인 페이지로 리다이렉트 |
| API 요청 시 | Authorization: Bearer {token} 헤더에 포함 |

### 3.5 인증 에러 처리

| 상황 | 동작 |
|------|------|
| 토큰 없음 | 로그인 페이지로 리다이렉트 |
| 토큰 만료 | 로그인 페이지로 리다이렉트 + "세션이 만료되었습니다" 메시지 |
| 토큰 위변조 | 로그인 페이지로 리다이렉트 |
| CodeHubRbacManage 권한 없음 | 권한 없음 안내 페이지 표시 |

---

## 4. 기능 요구사항

### 4.1 RBAC 데이터 모델

```
User ◆──M:M──◆ Group ◆──M:M──◆ Permission ◆──M:M──◆ Menu
```

- User ↔ Group: 다대다 (한 유저가 여러 그룹에 속할 수 있고, 한 그룹에 여러 유저가 속할 수 있음)
- Group ↔ Permission: 다대다 (한 그룹이 여러 권한을 가질 수 있고, 한 권한이 여러 그룹에 부여될 수 있음)
- Permission ↔ Menu: 다대다 (한 권한이 여러 메뉴에 접근할 수 있고, 한 메뉴가 여러 권한에 연결될 수 있음)

### 4.2 유저 관리

#### 데이터 필드

| 필드 | 타입 | 제약조건 | 설명 | 비고 |
|------|------|----------|------|------|
| id | int | auto (PK) | PK | 자동 생성 |
| ep_id | string | **required** | 임직원 고유 ID | |
| user_id | string | **required**, unique | 사용자 ID | |
| full_name | string \| null | **nullable** | 한글 이름 | null 가능, "" 불가 |
| en_full_name | string \| null | **nullable** | 영문 이름 | null 가능, "" 불가 |
| employee_number | string \| null | **nullable** | 사번 | null 가능, "" 불가 |
| grade_name | string \| null | **nullable** | 직급명 | null 가능, "" 불가 |
| title_code | string \| null | **nullable** | 직책 코드 | null 가능, "" 불가 |
| company_name | string \| null | **nullable** | 소속 회사명 | null 가능, "" 불가 |
| department_code | string \| null | **nullable** | 부서 코드 | null 가능, "" 불가 |
| department_name | string \| null | **nullable** | 부서명 | null 가능, "" 불가 |
| en_department_name | string \| null | **nullable** | 영문 부서명 | null 가능, "" 불가 |
| create_time | string (ISO 8601) | auto | 생성일시 | 자동 관리 |
| update_time | string (ISO 8601) | auto | 수정일시 | 자동 관리 |
| groups | int[] | M2M (blank=True) | 소속 그룹 ID 목록 | 빈 배열 가능 |

#### 기능 목록

| ID | 기능 | 설명 |
|----|------|------|
| U-01 | 유저 목록 조회 | 서버사이드 페이지네이션 (FastAPI 캐시 기반), 테이블 형태, 기본 page_size=20 |
| U-02 | 유저 검색 | user_id 완전 일치, full_name 완전 일치, department_name 부분 일치, department_code 완전 일치 (FastAPI 인메모리 필터링) |
| U-03 | 그룹별 유저 필터링 | 특정 그룹에 속한 유저만 필터링. **단, defaultUser 등 전체 유저 포함 그룹은 필터 드롭다운에서 제외** |
| U-04 | 유저 생성 | 2가지 방식 지원: (1) 직접 입력하여 생성 — 모든 필드를 수동 입력, (2) Knox에서 추가하기 — Knox ID(comma-separated, 최대 100명)를 입력하면 CodeHub BE의 manual-create API로 일괄 생성. 결과(성공/미발견/에러)를 다이얼로그에 표시 |
| U-05 | 유저 수정 | 기존 유저 정보 수정 |
| U-06 | 유저 삭제 | 유저 삭제 (확인 다이얼로그 포함) |
| U-07 | 유저-그룹 관계 관리 | 유저에 그룹 추가/제거 |
| U-08 | 유저 목록 정렬 | 테이블 컬럼 헤더 클릭으로 정렬. 기본값: id desc. 정렬 가능 컬럼: id, 이름, 사용자ID, 부서, 부서 코드, 수정 시간 |

### 4.3 그룹 관리

#### 데이터 필드

| 필드 | 타입 | 제약조건 | 설명 | 비고 |
|------|------|----------|------|------|
| id | int | auto (PK) | PK | 자동 생성 |
| group_name | string | **required** | 그룹명 | |
| create_time | string (ISO 8601) | auto | 생성일시 | 자동 관리 |
| update_time | string (ISO 8601) | auto | 수정일시 | 자동 관리 |
| permissions | int[] | M2M (blank=True) | 권한 ID 목록 | 빈 배열 가능 |

#### 기능 목록

| ID | 기능 | 설명 |
|----|------|------|
| G-01 | 그룹 목록 조회 | 페이지네이션 포함, 테이블 형태 |
| G-02 | 그룹 검색 | group_name으로 검색 |
| G-03 | 그룹 생성 | 신규 그룹 등록 폼 |
| G-04 | 그룹 수정 | 기존 그룹 정보 수정 |
| G-05 | 그룹 삭제 | 그룹 삭제 (확인 다이얼로그 포함) |
| G-06 | 그룹-권한 관계 관리 | 그룹에 권한 추가/제거 |
| G-07 | 그룹 목록 정렬 | 테이블 컬럼 헤더 클릭으로 정렬. 기본값: id desc. 정렬 가능 컬럼: id, 그룹명, 생성 시간, 수정 시간 |

### 4.4 권한 관리

#### 데이터 필드

| 필드 | 타입 | 제약조건 | 설명 | 비고 |
|------|------|----------|------|------|
| id | int | auto (PK) | PK | 자동 생성 |
| permission_name | string | **required** | 권한명 | |
| create_time | string (ISO 8601) | auto | 생성일시 | 자동 관리 |
| update_time | string (ISO 8601) | auto | 수정일시 | 자동 관리 |
| menus | int[] | M2M (blank=True) | 메뉴 ID 목록 | 빈 배열 가능 |

#### 기능 목록

| ID | 기능 | 설명 |
|----|------|------|
| P-01 | 권한 목록 조회 | 페이지네이션 포함, 테이블 형태 |
| P-02 | 권한 검색 | permission_name으로 검색 |
| P-03 | 권한 생성 | 신규 권한 등록 폼 |
| P-04 | 권한 수정 | 기존 권한 정보 수정 |
| P-05 | 권한 삭제 | 권한 삭제 (확인 다이얼로그 포함) |
| P-06 | 권한-메뉴 관계 관리 | 권한에 메뉴 추가/제거 |
| P-07 | 권한 목록 정렬 | 테이블 컬럼 헤더 클릭으로 정렬. 기본값: id desc. 정렬 가능 컬럼: id, 권한명, 생성 시간, 수정 시간 |

### 4.5 메뉴 관리

#### 데이터 필드

| 필드 | 타입 | 제약조건 | 설명 | 비고 |
|------|------|----------|------|------|
| id | int | auto (PK) | PK | 자동 생성 |
| menu_name | string | **required** | 메뉴명 | |
| permission_code | string | **required**, unique | 메뉴 권한 코드 | |
| parent_menu | int \| null | **nullable** (FK) | 부모 메뉴 ID | 자기참조, null이면 최상위 |
| create_time | string (ISO 8601) | auto | 생성일시 | 자동 관리 |
| update_time | string (ISO 8601) | auto | 수정일시 | 자동 관리 |

#### 기능 목록

| ID | 기능 | 설명 |
|----|------|------|
| M-01 | 메뉴 목록 조회 | 페이지네이션 포함, 테이블 형태 |
| M-02 | 메뉴 검색 | menu_name, permission_code로 검색 |
| M-03 | 메뉴 생성 | 신규 메뉴 등록 폼 |
| M-04 | 메뉴 수정 | 기존 메뉴 정보 수정 |
| M-05 | 메뉴 삭제 | 메뉴 삭제 (확인 다이얼로그 포함) |
| M-06 | 메뉴 목록 정렬 | 테이블 컬럼 헤더 클릭으로 정렬. 기본값: id desc. 정렬 가능 컬럼: id, 메뉴명, 권한 코드, 생성 시간, 수정 시간 |

---

## 5. 화면 정의

### 5.1 공통 레이아웃

```
┌─────────────────────────────────────────────┐
│  Logo [CodeHub RBAC]     [유저정보] [로그아웃] │  ← 헤더
├──────────┬──────────────────────────────────┤
│          │                                  │
│  대시보드  │                                  │
│  유저 관리 │         메인 콘텐츠 영역            │
│  그룹 관리 │                                  │
│  권한 관리 │                                  │
│  메뉴 관리 │                                  │
│          │                                  │
├──────────┴──────────────────────────────────┤
│  사이드바       콘텐츠                         │
└─────────────────────────────────────────────┘
```

- **헤더**: 서비스 로고, 로그인 사용자 정보, 로그아웃 버튼
- **사이드 네비게이션**: 페이지 이동 메뉴 (대시보드, 유저, 그룹, 권한, 메뉴)
- **메인 콘텐츠**: 각 페이지의 주요 내용

### 5.2 로그인 페이지 (`/login`)

- SSO 로그인 버튼 제공
- 클릭 시 FastAPI의 `/api/auth/sso` 호출 → IdP 리다이렉트

### 5.3 인증 콜백 페이지 (`/auth`)

- URL query param에서 token 추출
- 토큰 저장 후 권한 체크 → 대시보드로 리다이렉트
- 권한 없을 시 접근 불가 안내 표시

### 5.4 대시보드 페이지 (`/`)

- 유저 현황 요약 정보 제공
  - 전체 유저 수
  - 전체 그룹 수
  - 전체 권한 수
  - 전체 메뉴 수
- 최근 생성/수정된 유저 목록 (간략)

### 5.5 유저 관리 페이지 (`/users`)

```
┌──────────────────────────────────────────────────────────────────┐
│  유저 관리                                      [+ 유저 생성 ▾] │
├──────────────────────────────────────────────────────────────────┤
│  [검색어 입력]  [그룹 필터 드롭다운]     [검색 버튼]               │
│  (이름, 사용자 ID, 부서명, 부서 코드 검색)                         │
├──────────────────────────────────────────────────────────────────┤
│  ID↕ | 이름↕ | 사용자ID↕ | 부서↕ | 부서코드↕ | 수정시간↕ | 그룹 | 액션 │
│  ─────────────────────────────────────────────────────────────── │
│  5   | 홍길동 | hong.gd  | 개발팀 | DEV01   | 2026. 3. 4. | Admin | ✏🗑 │
│  4   | 김철수 | kim.cs   | 기획팀 | PLA01   | 2026. 3. 3. | User  | ✏🗑 │
│  ...                                                             │
├──────────────────────────────────────────────────────────────────┤
│  < 1 2 3 ... >                                                   │  ← 페이지네이션
└──────────────────────────────────────────────────────────────────┘
```
- ↕ 표시: 클릭 가능한 정렬 헤더 (활성 컬럼은 방향 화살표 표시)

- **유저 생성**: 드롭다운 버튼으로 2가지 생성 방식 선택
  - "직접 입력하여 생성": 기존 UserFormDialog (모든 필드 수동 입력)
  - "Knox에서 추가하기": KnoxCreateDialog (Knox ID 일괄 입력)

```
KnoxCreateDialog:
┌─────────────────────────────────────────────┐
│  Knox에서 추가하기                        [X] │
├─────────────────────────────────────────────┤
│  Knox ID를 쉼표로 구분하여 입력하세요          │
│  (최대 100명)                                │
│  ┌─────────────────────────────────────────┐ │
│  │ abc.kim, test.abc, hong.gd              │ │
│  └─────────────────────────────────────────┘ │
│                            [취소] [추가하기]  │
├─────────────────────────────────────────────┤
│  (결과 표시 영역 — API 호출 후 표시)            │
│  ✓ 성공: 2명 — jy.kweon, yoonble.kim        │
│  ✗ 미발견: 1명 — test.kdkd                   │
│  ✗ 서버 에러: 0명                             │
└─────────────────────────────────────────────┘
```

- **유저 수정**: 모달 또는 사이드 패널로 폼 제공
- **유저-그룹 관계 관리**: 유저 상세/수정 화면 내에서 그룹 추가/제거
  - 현재 소속 그룹 목록 표시 (태그 형태, X 버튼으로 제거)
  - 그룹 추가 드롭다운/검색으로 새 그룹 추가

### 5.6 그룹 관리 페이지 (`/groups`)

테이블 컬럼: ID↕ | 그룹명↕ | 권한 수 | 생성 시간↕ | 수정 시간↕ | 액션
- 권한 수는 계산값(배열 길이)이므로 정렬 불가, 나머지 컬럼은 헤더 클릭 정렬 지원
- 그룹 상세/수정 화면에서 권한 추가/제거 관리
  - 현재 보유 권한 목록 표시
  - 권한 추가 드롭다운/검색으로 새 권한 추가

### 5.7 권한 관리 페이지 (`/permissions`)

테이블 컬럼: ID↕ | 권한명↕ | 연결 메뉴 수 | 생성 시간↕ | 수정 시간↕ | 액션
- 연결 메뉴 수는 계산값(배열 길이)이므로 정렬 불가, 나머지 컬럼은 헤더 클릭 정렬 지원
- 권한 상세/수정 화면에서 메뉴 추가/제거 관리
  - 현재 연결 메뉴 목록 표시
  - 메뉴 추가 드롭다운/검색으로 새 메뉴 추가

### 5.8 메뉴 관리 페이지 (`/menus`)

테이블 컬럼: ID↕ | 메뉴명↕ | 권한 코드↕ | 생성 시간↕ | 수정 시간↕ | 액션
- 모든 컬럼 헤더 클릭 정렬 지원 (관계 관리 없음)

### 5.9 공통 인터랙션 패턴

| 패턴 | 설명 |
|------|------|
| 생성/수정 | 모달 다이얼로그 또는 사이드 시트로 폼 제공 |
| 삭제 | 확인 다이얼로그 표시 후 진행 |
| 관계 추가 | 드롭다운/콤보박스에서 대상 선택 후 추가 |
| 관계 제거 | 태그의 X 버튼 또는 체크박스 해제 후 저장 |
| 검색 | 검색어 입력 후 Enter 또는 검색 버튼 클릭 |
| 로딩 | 데이터 로딩 시 스켈레톤 UI 또는 스피너 표시 |
| 에러 | Toast 알림으로 에러 메시지 표시 |
| 성공 | Toast 알림으로 성공 메시지 표시 |

---

## 6. API 연동 스펙

### 6.1 FastAPI 자체 API

#### 인증

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/auth/sso` | SSO 로그인 시작 (IdP로 리다이렉트) |
| POST | `/api/auth/acs` | IdP 콜백 (id_token 수신 및 자체 JWT 발급) |
| GET | `/api/auth/accessible-permissions` | 현재 토큰 기준 접근 가능 권한 목록 조회 |

#### 데이터 API (캐싱 + 페이지네이션 제공)

FastAPI는 CodeHub BE에서 전체 데이터를 가져와 인메모리 캐싱 후, FE에 페이지네이션/검색/필터링된 결과를 제공한다.
CUD 요청은 CodeHub BE로 전달하고, 성공 시 해당 엔티티의 캐시를 무효화한다.

| FastAPI 경로 | CodeHub BE 경로 | 비고 |
|-------------|----------------|------|
| `/api/v1/users/` | `{CodehubBe}/api/v1/commons/user/` | List: 캐시 기반 페이지네이션 |
| `/api/v1/users/{id}/` | `{CodehubBe}/api/v1/commons/user/{id}/` | Detail/Update/Delete: 프록시 |
| `/api/v1/users/manual-create` | `{CodehubBe}/api/v1/commons/user-etc/manual-create/` | Knox ID 일괄 생성: 프록시 (성공 시 유저 캐시 무효화) |
| `/api/v1/groups/` | `{CodehubBe}/api/v1/commons/group/` | List: 캐시 기반 페이지네이션 |
| `/api/v1/groups/{id}/` | `{CodehubBe}/api/v1/commons/group/{id}/` | Detail/Update/Delete: 프록시 |
| `/api/v1/permissions/` | `{CodehubBe}/api/v1/commons/permission/` | List: 캐시 기반 페이지네이션 |
| `/api/v1/permissions/{id}/` | `{CodehubBe}/api/v1/commons/permission/{id}/` | Detail/Update/Delete: 프록시 |
| `/api/v1/menus/` | `{CodehubBe}/api/v1/commons/menu/` | List: 캐시 기반 페이지네이션 |
| `/api/v1/menus/{id}/` | `{CodehubBe}/api/v1/commons/menu/{id}/` | Detail/Update/Delete: 프록시 |

**List 요청 시 FastAPI가 제공하는 추가 Query Parameters:**

| 파라미터 | 설명 | 기본값 |
|---------|------|--------|
| `page` | 현재 페이지 번호 (1-based) | 1 |
| `page_size` | 페이지당 항목 수 | 20 |
| `search` | 통합 검색어 (FastAPI에서 인메모리 필터링) | - |
| `group_filter` | 그룹 ID로 유저 필터 (유저 API 전용) | - |
| `sort_by` | 정렬 기준 컬럼 (엔티티별 허용 필드: 유저 — id/full_name/user_id/department_name/department_code/update_time, 그룹 — id/group_name/create_time/update_time, 권한 — id/permission_name/create_time/update_time, 메뉴 — id/menu_name/permission_code/create_time/update_time) | `id` |
| `sort_order` | 정렬 방향: `asc` / `desc` (전체 List API 공통) | `desc` |

기존 CodeHub BE의 Query Parameter(id, user_id 등 comma-separated 필터)도 그대로 지원하되, FastAPI 캐시 내에서 인메모리로 처리한다.

### 6.2 CodeHub BE API (DRF 표준 REST 패턴)

모든 요청에는 `Authorization: Bearer {token}` 헤더가 필요하다.

#### 유저 API: `{CodehubBe}/api/v1/commons/user/`

| 메서드 | 경로 | 설명 | 요청 본문 |
|--------|------|------|----------|
| GET | `/` | 유저 목록 조회 | - |
| GET | `/{id}/` | 유저 상세 조회 | - |
| POST | `/` | 유저 생성 | 유저 필드 (JSON) |
| PUT | `/{id}/` | 유저 전체 수정 | 유저 필드 전체 (JSON) |
| PATCH | `/{id}/` | 유저 부분 수정 | 변경할 필드만 (JSON) |
| DELETE | `/{id}/` | 유저 삭제 | - |

#### 유저 일괄 생성 API: `{CodehubBe}/api/v1/commons/user-etc/manual-create/`

| 메서드 | 경로 | 설명 | Query Parameter |
|--------|------|------|----------------|
| POST | `/?knox_id=abc.kim,test.abc` | Knox ID로 유저 일괄 생성 | `knox_id`: comma-separated Knox ID (최대 100명) |

**응답 (200):**
```json
{
  "count_is_success": 2,
  "count_is_not_found": 1,
  "count_is_internal_server_error": 0,
  "success_user_ids": ["jy.kweon", "yoonble.kim"],
  "not_found_user_ids": ["test.kdkd"],
  "internal_server_error_user_ids": []
}
```

**목록 조회 Query Parameters:**
- `id`, `user_id`, `full_name`, `employee_number`: comma-separated 필터
- `groups`: 그룹 ID로 필터 (조인 모델 id)
- `group_name`: 그룹명으로 필터 (조인 모델 컬럼)
- `search`: 통합 검색 (user_id 완전 일치 OR full_name 완전 일치 OR department_name 부분 일치)

#### 그룹 API: `{CodehubBe}/api/v1/commons/group/`

| 메서드 | 경로 | 설명 | 요청 본문 |
|--------|------|------|----------|
| GET | `/` | 그룹 목록 조회 | - |
| GET | `/{id}/` | 그룹 상세 조회 | - |
| POST | `/` | 그룹 생성 | `{ group_name, permissions: [id, ...] }` |
| PUT | `/{id}/` | 그룹 전체 수정 | `{ group_name, permissions: [id, ...] }` |
| PATCH | `/{id}/` | 그룹 부분 수정 | 변경할 필드만 |
| DELETE | `/{id}/` | 그룹 삭제 | - |

**목록 조회 Query Parameters:**
- `id`, `group_name`: comma-separated 필터
- `permissions`: 권한 ID로 필터
- `permission_name`: 권한명으로 필터

#### 권한 API: `{CodehubBe}/api/v1/commons/permission/`

| 메서드 | 경로 | 설명 | 요청 본문 |
|--------|------|------|----------|
| GET | `/` | 권한 목록 조회 | - |
| GET | `/{id}/` | 권한 상세 조회 | - |
| POST | `/` | 권한 생성 | `{ permission_name, menus: [id, ...] }` |
| PUT | `/{id}/` | 권한 전체 수정 | `{ permission_name, menus: [id, ...] }` |
| PATCH | `/{id}/` | 권한 부분 수정 | 변경할 필드만 |
| DELETE | `/{id}/` | 권한 삭제 | - |

**목록 조회 Query Parameters:**
- `id`, `permission_name`: comma-separated 필터
- `menus`: 메뉴 ID로 필터
- `menu_name`, `permission_code`: 조인 모델 컬럼 필터

#### 메뉴 API: `{CodehubBe}/api/v1/commons/menu/`

| 메서드 | 경로 | 설명 | 요청 본문 |
|--------|------|------|----------|
| GET | `/` | 메뉴 목록 조회 | - |
| GET | `/{id}/` | 메뉴 상세 조회 | - |
| POST | `/` | 메뉴 생성 | `{ menu_name, permission_code }` |
| PUT | `/{id}/` | 메뉴 전체 수정 | `{ menu_name, permission_code }` |
| PATCH | `/{id}/` | 메뉴 부분 수정 | 변경할 필드만 |
| DELETE | `/{id}/` | 메뉴 삭제 | - |

**목록 조회 Query Parameters:**
- `id`, `menu_name`, `permission_code`: comma-separated 필터

#### 권한 확인 API: `{CodehubBe}/api/v1/auths/accessible-permission-info/`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/` | 현재 토큰 사용자의 접근 가능 권한 목록 |

**응답 예시:**
```json
[
  { "permission_name": "CodeHubRbacManage" },
  { "permission_name": "HomeMenuPermission" }
]
```

### 6.3 M:M 관계 수정 방식

DRF 표준 패턴에 따라, 관계는 엔티티 수정 시 관계 필드(배열)를 함께 전달하여 업데이트한다.

**예시: 유저의 그룹 변경**
```
PATCH /api/v1/commons/user/{id}/
Body: { "groups": [1, 3, 5] }
```
→ 해당 유저의 그룹이 [1, 3, 5]로 전체 교체됨

---

## 7. 비기능 요구사항

### 7.1 Dummy 모드

환경변수 `DUMMY_MODE=true`로 활성화한다.

| 항목 | Dummy 모드 동작 |
|------|----------------|
| SSO 인증 | IdP 호출 없이 미리 정의된 Dummy 사용자로 JWT 즉시 발급 |
| CodeHub BE API | FastAPI 내부에서 인메모리 Mock 데이터로 CRUD 처리 |
| 권한 체크 | 항상 `CodeHubRbacManage` 권한 포함 |

### 7.2 환경변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DUMMY_MODE` | Dummy 모드 활성화 | `true` / `false` |
| `CODEHUB_BE_URL` | CodeHub BE 기본 URL | `https://codehub-api.internal.com` |
| `IDP_ENTITY_ID` | IdP 인증 URL | `https://idp.internal.com/oauth2/authorize` |
| `IDP_CLIENT_ID` | IdP 클라이언트 ID | `codehub-rbac-manage` |
| `SP_REDIRECT_URL` | SSO 콜백 URL | `https://rbac.internal.com/api/auth/acs` |
| `IDP_CERT_PATH` | IdP 공개키 인증서 경로 | `/certs/idp.cer` |
| `JWT_SECRET_KEY` | 자체 JWT 서명용 시크릿 키 | (비밀값) |
| `FRONTEND_URL` | 프론트엔드 도메인 | `https://rbac.internal.com` |

### 7.3 디자인 가이드

| 항목 | 값 |
|------|-----|
| 주요 색상 (Primary) | `#0d6154` |
| 보조 색상 (Secondary) | `#46cf94` |
| 배경/기본 색상 | 흰색 계열 |
| 스타일 컨셉 | 심플, 미니멀리즘, 모던 |
| 다크 모드 | 미지원 (라이트 모드 전용) |
| 아이콘 | lucide-react |
| UI 컴포넌트 | shadcn/ui |
