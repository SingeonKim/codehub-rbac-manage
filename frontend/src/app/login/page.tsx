"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  // 이미 인증된 상태면 대시보드로 이동
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = () => {
    // FastAPI의 SSO 엔드포인트로 이동 → IdP 또는 Dummy 모드 처리
    window.location.href = "/api/auth/sso";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">C</span>
          </div>
          <CardTitle className="text-2xl">CodeHub RBAC</CardTitle>
          <p className="text-sm text-muted-foreground">
            역할 기반 접근 제어 관리 시스템
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full" size="lg">
            <LogIn className="mr-2 h-5 w-5" />
            SSO 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
