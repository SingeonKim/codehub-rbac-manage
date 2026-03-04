"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, hasRbacAccess, removeToken } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // 인증 + 인가 체크: 두 조건 중 하나라도 실패 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated()) {
      // 토큰 없거나 만료
      router.replace("/login");
    } else if (!hasRbacAccess()) {
      // 토큰은 있지만 CodeHubRbacManage 권한 플래그 없음 (직접 URL 접근 등 비정상 경로)
      // 토큰도 함께 삭제해 /login에서 대시보드로 튕기지 않게 방지
      removeToken();
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
