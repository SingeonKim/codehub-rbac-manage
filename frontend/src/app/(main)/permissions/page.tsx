"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
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
import { Pagination } from "@/components/features/pagination";
import { ConfirmDialog } from "@/components/features/confirm-dialog";
import {
  RelationManager,
  type RelationOption,
} from "@/components/features/relation-manager";
import { api } from "@/lib/api";
import type {
  Menu,
  Permission,
  PermissionCreate,
  PermissionUpdate,
  PaginatedResponse,
} from "@/lib/types";

const PAGE_SIZE = 20;

// 정렬 대상 컬럼 타입 (백엔드 _PERMISSION_SORT_FIELDS와 동일)
type SortField = "id" | "permission_name" | "create_time" | "update_time";
type SortOrder = "asc" | "desc";

// 정렬 가능한 컬럼 헤더 컴포넌트
// 클릭 시 asc/desc 전환, 활성 컬럼에는 방향 화살표, 비활성은 흐릿한 양방향 화살표
function SortableHeader({
  field,
  label,
  current,
  order,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  order: SortOrder;
  onSort: (f: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground"
      onClick={() => onSort(field)}
    >
      {/* flex items-center → display:flex + 수직 가운데 정렬 */}
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          order === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

function PermissionFormDialog({
  open,
  permission,
  menuOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  permission: Permission | null;
  menuOptions: RelationOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!permission;
  const [name, setName] = useState("");
  const [selectedMenus, setSelectedMenus] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(permission?.permission_name ?? "");
    setSelectedMenus(permission?.menus ?? []);
  }, [permission]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("권한명을 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch<Permission>(`/v1/permissions/${permission!.id}`, {
          permission_name: name,
          menus: selectedMenus,
        } as PermissionUpdate);
        toast.success("권한이 수정되었습니다.");
      } else {
        await api.post<Permission>("/v1/permissions", {
          permission_name: name,
          menus: selectedMenus,
        } as PermissionCreate);
        toast.success("권한이 생성되었습니다.");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "권한 수정" : "권한 생성"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="permission_name">권한명</Label>
            <Input
              id="permission_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: ProjectPermission"
            />
          </div>
          <RelationManager
            label="연결 메뉴"
            selectedIds={selectedMenus}
            options={menuOptions}
            onChange={setSelectedMenus}
            placeholder="메뉴 추가..."
          />
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

export default function PermissionsPage() {
  const [data, setData] = useState<PaginatedResponse<Permission> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [menuOptions, setMenuOptions] = useState<RelationOption[]>([]);

  // 정렬 상태: 기본값 id 내림차순
  const [sortBy, setSortBy] = useState<SortField>("id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Permission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 메뉴 목록은 전체를 한 번만 로드 (수십 건 수준)
  useEffect(() => {
    api
      .get<PaginatedResponse<Menu>>("/v1/menus?page=1&page_size=100")
      .then((res) =>
        setMenuOptions(
          res.items.map((m) => ({ id: m.id, label: m.menu_name }))
        )
      );
  }, []);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      sort_by: sortBy,
      sort_order: sortOrder,
      ...(search ? { search } : {}),
    });
    const res = await api.get<PaginatedResponse<Permission>>(
      `/v1/permissions?${params.toString()}`
    );
    setData(res);
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  // 컬럼 헤더 클릭 시 정렬 전환
  // 같은 컬럼: asc ↔ desc 토글 / 다른 컬럼: 해당 컬럼 desc로 새로 정렬
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/v1/permissions/${deleteTarget.id}`);
      toast.success("권한이 삭제되었습니다.");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ISO 날짜 문자열을 한국어 날짜 형식으로 변환 (예: 2026. 3. 4.)
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">권한 관리</h1>
          <p className="text-sm text-muted-foreground">
            CodeHub 서비스의 권한을 관리합니다.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          권한 생성
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="권한명 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-muted-foreground">
              <SortableHeader field="id" label="ID" current={sortBy} order={sortOrder} onSort={handleSort} />
              <SortableHeader field="permission_name" label="권한명" current={sortBy} order={sortOrder} onSort={handleSort} />
              {/* 연결 메뉴 수는 배열 길이 계산값이므로 서버 정렬 불가 → 일반 헤더 */}
              <th className="px-4 py-3 font-medium">연결 메뉴 수</th>
              <SortableHeader field="create_time" label="생성 시간" current={sortBy} order={sortOrder} onSort={handleSort} />
              <SortableHeader field="update_time" label="수정 시간" current={sortBy} order={sortOrder} onSort={handleSort} />
              <th className="w-24 px-4 py-3 font-medium text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  로딩 중...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              data.items.map((perm) => (
                <tr key={perm.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-muted-foreground">{perm.id}</td>
                  <td className="px-4 py-3 font-medium">{perm.permission_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{perm.menus.length}개</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {perm.create_time ? formatDate(perm.create_time) : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {perm.update_time ? formatDate(perm.update_time) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditTarget(perm);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(perm)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
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

      <PermissionFormDialog
        open={formOpen}
        permission={editTarget}
        menuOptions={menuOptions}
        onClose={() => setFormOpen(false)}
        onSaved={fetchData}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="권한 삭제"
        description={`"${deleteTarget?.permission_name}" 권한을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
