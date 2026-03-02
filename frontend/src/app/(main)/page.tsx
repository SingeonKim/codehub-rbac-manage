"use client";

import { useEffect, useState } from "react";
import { Users, Group, Shield, Menu as MenuIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { PaginatedResponse, User } from "@/lib/types";

interface SummaryCard {
  label: string;
  count: number | null;
  icon: React.ElementType;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryCard[]>([
    { label: "전체 유저", count: null, icon: Users },
    { label: "전체 그룹", count: null, icon: Group },
    { label: "전체 권한", count: null, icon: Shield },
    { label: "전체 메뉴", count: null, icon: MenuIcon },
  ]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  useEffect(() => {
    // 4개 엔티티의 총 건수를 병렬로 조회 (page_size=1로 total만 확인)
    Promise.allSettled([
      api.get<PaginatedResponse<User>>("/v1/users?page=1&page_size=1"),
      api.get<PaginatedResponse<unknown>>("/v1/groups?page=1&page_size=1"),
      api.get<PaginatedResponse<unknown>>("/v1/permissions?page=1&page_size=1"),
      api.get<PaginatedResponse<unknown>>("/v1/menus?page=1&page_size=1"),
    ]).then(([users, groups, permissions, menus]) => {
      setSummary([
        {
          label: "전체 유저",
          count: users.status === "fulfilled" ? users.value.total : 0,
          icon: Users,
        },
        {
          label: "전체 그룹",
          count: groups.status === "fulfilled" ? groups.value.total : 0,
          icon: Group,
        },
        {
          label: "전체 권한",
          count:
            permissions.status === "fulfilled" ? permissions.value.total : 0,
          icon: Shield,
        },
        {
          label: "전체 메뉴",
          count: menus.status === "fulfilled" ? menus.value.total : 0,
          icon: MenuIcon,
        },
      ]);

      // 최근 유저 5명 표시 (첫 페이지 기준)
      if (users.status === "fulfilled") {
        setRecentUsers(users.value.items as User[]);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CodeHub RBAC 현황 요약
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <item.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {item.count === null ? (
                  <span className="animate-pulse text-muted-foreground">—</span>
                ) : (
                  item.count.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 유저 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">최근 등록 유저</h2>
        <div className="rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">사용자 ID</th>
                <th className="px-4 py-3 font-medium">부서</th>
                <th className="px-4 py-3 font-medium">직급</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    로딩 중...
                  </td>
                </tr>
              ) : (
                recentUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">{user.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.user_id}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.department_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.grade_name || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
