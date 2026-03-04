"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/features/pagination";
import { ConfirmDialog } from "@/components/features/confirm-dialog";
import {
  RelationManager,
  type RelationOption,
} from "@/components/features/relation-manager";
import { api } from "@/lib/api";
import type {
  User,
  UserCreate,
  UserUpdate,
  Group,
  PaginatedResponse,
} from "@/lib/types";

const PAGE_SIZE = 20;
// defaultUser 그룹처럼 전체 유저를 포함하는 그룹명 목록
// 그룹 필터 드롭다운에서 제외한다
const EXCLUDED_GROUP_NAMES = ["defaultUser"];

function UserFormDialog({
  open,
  user,
  groupOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: User | null;
  groupOptions: RelationOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<Partial<UserCreate>>({
    user_id: "",
    full_name: "",
    en_full_name: "",
    employee_number: "",
    grade_name: "",
    company_name: "",
    department_name: "",
    groups: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      ep_id: user?.ep_id ?? "",
      user_id: user?.user_id ?? "",
      full_name: user?.full_name ?? "",
      en_full_name: user?.en_full_name ?? "",
      employee_number: user?.employee_number ?? "",
      grade_name: user?.grade_name ?? "",
      company_name: user?.company_name ?? "",
      department_name: user?.department_name ?? "",
      groups: user?.groups ?? [],
    });
  }, [user]);

  const set = (key: keyof UserCreate, value: string | number[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.ep_id || !form.user_id || !form.full_name) {
      toast.error("EP ID, 사용자 ID, 이름을 입력하세요.");
      return;
    }

    // nullable 필드: 빈 문자열을 null로 변환
    // Django CharField(null=True, blank 미지정)는 null은 허용하지만 ""는 거부함
    const nullableFields = [
      "full_name", "en_full_name", "employee_number", "grade_name",
      "title_code", "company_name", "department_code", "department_name",
      "en_department_name",
    ] as const;
    const payload = { ...form };
    for (const field of nullableFields) {
      if (payload[field] === "") {
        (payload as Record<string, unknown>)[field] = null;
      }
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.patch<User>(`/v1/users/${user!.id}`, payload as UserUpdate);
        toast.success("유저가 수정되었습니다.");
      } else {
        await api.post<User>("/v1/users", payload as UserCreate);
        toast.success("유저가 생성되었습니다.");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "유저 수정" : "유저 생성"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>사용자 ID *</Label>
            <Input
              value={form.user_id}
              onChange={(e) => set("user_id", e.target.value)}
              placeholder="예: hong.gd"
            />
          </div>
          <div className="space-y-1.5">
            <Label>EP ID *</Label>
            <Input
              value={form.ep_id}
              onChange={(e) => set("ep_id", e.target.value)}
              placeholder="예: EP00001"
            />
          </div>
          <div className="space-y-1.5">
            <Label>한글 이름 *</Label>
            <Input
              value={form.full_name ?? ""}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="예: 홍길동"
            />
          </div>
          <div className="space-y-1.5">
            <Label>영문 이름</Label>
            <Input
              value={form.en_full_name ?? ""}
              onChange={(e) => set("en_full_name", e.target.value)}
              placeholder="예: Gil-Dong Hong"
            />
          </div>
          <div className="space-y-1.5">
            <Label>사번</Label>
            <Input
              value={form.employee_number ?? ""}
              onChange={(e) => set("employee_number", e.target.value)}
              placeholder="예: EMP1001"
            />
          </div>
          <div className="space-y-1.5">
            <Label>직급</Label>
            <Input
              value={form.grade_name ?? ""}
              onChange={(e) => set("grade_name", e.target.value)}
              placeholder="예: 대리"
            />
          </div>
          <div className="space-y-1.5">
            <Label>회사명</Label>
            <Input
              value={form.company_name ?? ""}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="예: CodeHub Inc."
            />
          </div>
          <div className="space-y-1.5">
            <Label>부서명</Label>
            <Input
              value={form.department_name ?? ""}
              onChange={(e) => set("department_name", e.target.value)}
              placeholder="예: 플랫폼개발팀"
            />
          </div>
          <div className="col-span-2">
            <RelationManager
              label="소속 그룹"
              selectedIds={form.groups ?? []}
              options={groupOptions}
              onChange={(ids) => set("groups", ids)}
              placeholder="그룹 추가..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // 그룹 목록 (필터 드롭다운 + 폼용)
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  // 필터 드롭다운: defaultUser 제외
  const [filterGroups, setFilterGroups] = useState<Group[]>([]);
  // 폼 RelationManager: 모든 그룹 (defaultUser 포함하되 disabled 처리)
  const [groupOptions, setGroupOptions] = useState<RelationOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api
      .get<PaginatedResponse<Group>>("/v1/groups?page=1&page_size=100")
      .then((res) => {
        const groups = res.items;
        setAllGroups(groups);
        // 필터 드롭다운: 전체 유저 포함 그룹 제외
        setFilterGroups(
          groups.filter((g) => !EXCLUDED_GROUP_NAMES.includes(g.group_name))
        );
        // 폼 옵션: defaultUser는 disabled 처리
        setGroupOptions(
          groups.map((g) => ({
            id: g.id,
            label: g.group_name,
            disabled: EXCLUDED_GROUP_NAMES.includes(g.group_name),
            disabledReason: EXCLUDED_GROUP_NAMES.includes(g.group_name)
              ? "전체 유저 포함 그룹"
              : undefined,
          }))
        );
      });
  }, []);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(groupFilter !== "all" ? { group_filter: groupFilter } : {}),
    });
    const res = await api.get<PaginatedResponse<User>>(
      `/v1/users?${params.toString()}`
    );
    setData(res);
  }, [page, search, groupFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleGroupFilter = (value: string) => {
    setGroupFilter(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/v1/users/${deleteTarget.id}`);
      toast.success("유저가 삭제되었습니다.");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // 유저의 그룹명 표시 (defaultUser 제외)
  const getGroupNames = (groupIds: number[]) => {
    return groupIds
      .map((id) => allGroups.find((g) => g.id === id)?.group_name)
      .filter((name): name is string => !!name && !EXCLUDED_GROUP_NAMES.includes(name));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">유저 관리</h1>
          <p className="text-sm text-muted-foreground">
            CodeHub 서비스의 유저를 관리합니다.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          유저 생성
        </Button>
      </div>

      {/* 검색 + 그룹 필터 */}
      <div className="flex gap-2">
        <Input
          placeholder="이름, 사용자 ID, 부서명 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
        <Select value={groupFilter} onValueChange={handleGroupFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="그룹 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 그룹</SelectItem>
            {filterGroups.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.group_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-muted-foreground">
              <th className="w-16 px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">사용자 ID</th>
              <th className="px-4 py-3 font-medium">부서</th>
              <th className="px-4 py-3 font-medium">직급</th>
              <th className="px-4 py-3 font-medium">그룹</th>
              <th className="w-24 px-4 py-3 font-medium text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  로딩 중...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              data.items.map((user) => {
                const groupNames = getGroupNames(user.groups);
                return (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-muted-foreground">{user.id}</td>
                    <td className="px-4 py-3 font-medium">{user.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.user_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.department_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.grade_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {groupNames.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          groupNames.map((name) => (
                            <Badge key={name} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditTarget(user);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.total_pages > 1 && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <UserFormDialog
        open={formOpen}
        user={editTarget}
        groupOptions={groupOptions}
        onClose={() => setFormOpen(false)}
        onSaved={fetchData}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="유저 삭제"
        description={`"${deleteTarget?.full_name}" 유저를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
