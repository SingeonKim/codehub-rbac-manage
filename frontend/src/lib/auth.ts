/**
 * 클라이언트 사이드 토큰 관리
 *
 * localStorage에 JWT를 저장하고, 만료 여부를 체크한다.
 * SSO 방식이라 refresh token은 없으며, 만료 시 재로그인이 필요하다.
 */

const TOKEN_KEY = "codehub_rbac_token";
// CodeHubRbacManage 권한 확인 완료 여부를 저장하는 플래그 키
// 토큰과 항상 같은 생명주기로 관리된다 (removeToken() 호출 시 함께 삭제)
const ACCESS_KEY = "codehub_rbac_access";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  // 권한 플래그도 함께 삭제 → 토큰 없이 플래그만 남는 상황 방지
  localStorage.removeItem(ACCESS_KEY);
}

// 권한 확인 성공 시 호출 → 이후 (main)/layout.tsx에서 재검증에 사용
export function setHasAccess(): void {
  localStorage.setItem(ACCESS_KEY, "true");
}

// CodeHubRbacManage 권한 플래그 확인
// Django의 request.user.has_perm()과 유사한 역할
export function hasRbacAccess(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ACCESS_KEY) === "true";
}

export function isTokenExpired(token: string): boolean {
  try {
    // JWT payload는 base64url 인코딩된 두 번째 파트
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}
