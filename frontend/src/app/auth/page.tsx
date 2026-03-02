"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { AccessiblePermission } from "@/lib/types";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("인증 토큰이 없습니다.");
      return;
    }

    // 토큰 저장 후 권한 체크
    setToken(token);

    api
      .get<AccessiblePermission[]>("/auth/accessible-permissions")
      .then((permissions) => {
        const hasAccess = permissions.some(
          (p) => p.permission_name === "CodeHubRbacManage"
        );

        if (hasAccess) {
          router.replace("/");
        } else {
          setError("CodeHub RBAC 관리 권한이 없습니다. 관리자에게 문의하세요.");
        }
      })
      .catch(() => {
        setError("권한 확인 중 오류가 발생했습니다.");
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-destructive">
            접근 불가
          </h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <a href="/login" className="text-primary underline">
            로그인 페이지로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-muted-foreground">인증 처리 중...</p>
    </div>
  );
}

// Next.js 15에서 useSearchParams는 Suspense 경계 내에서 사용해야 한다
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
