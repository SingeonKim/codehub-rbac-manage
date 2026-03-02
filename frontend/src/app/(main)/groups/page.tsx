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
import { Pagination } from "@/components/features/pagination";
import { ConfirmDialog } from "@/components/features/confirm-dialog";
import {
  RelationManager,
  type RelationOption,
} from "@/components/features/relation-manager";
import { api } from "@/lib/api";
import type {
  Group,
  GroupCreate,
  GroupUpdate,
  Permission,
  PaginatedResponse,
} from "@/lib/types";

const PAGE_SIZE = 20;

function GroupFormDialog({
  open,
  group,
  permissionOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  group: Group | null;
  permissionOptions: RelationOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(group?.group_name ?? "");
    setSelectedPerms(group?.permissions ?? []);
  }, [group]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("그룹명을 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch<Group>(`/v1/groups/${group!.id}`, {
          group_name: name,
          permissions: selectedPerms,
        } as GroupUpdate);
        toast.success("그룹이 수정되었습니다.");
      } else {
        await api.post<Group>("/v1/groups", {
          group_name: name,
          permissions: selectedPerms,
        } as GroupCreate);
        toast.success("그룹이 생성되었습니다.");
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
          <DialogTitle>{isEdit ? "그룹 수정" : "그룹 생성"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group_name">그룹명</Label>
            <Input
              id="group_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Developer"
            />
          </div>
          <RelationManager
            label="보유 권한"
            selectedIds={selectedPerms}
            options={permissionOptions}
            onChange={setSelectedPerms}
            placeholder="권한 추가..."
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

export default function GroupsPage() {
  const [data, setData] = useState<PaginatedResponse<Group> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [permissionOptions, setPermissionOptions] = useState<RelationOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 권한 목록 전체 로드 (수십 건 수준)
  useEffect(() => {
    api
      .get<PaginatedResponse<Permission>>("/v1/permissions?page=1&page_size=100")
      .then((res) =>
        setPermissionOptions(
          res.items.map((p) => ({ id: p.id, label: p.permission_name }))
        )
      );
  }, []);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      ...(search ? { search } : {}),
    });
    const res = await api.get<PaginatedResponse<Group>>(
      `/v1/groups?${params.toString()}`
    );
    setData(res);
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/v1/groups/${deleteTarget.id}`);
      toast.success("그룹이 삭제되었습니다.");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">그룹 관리</h1>
          <p className="text-sm text-muted-foreground">
            CodeHub 서비스의 그룹을 관리합니다.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          그룹 생성
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="그룹명 검색"
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
              <th className="w-16 px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">그룹명</th>
              <th className="px-4 py-3 font-medium">권한 수</th>
              <th className="w-24 px-4 py-3 font-medium text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  로딩 중...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              data.items.map((group) => (
                <tr key={group.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-muted-foreground">{group.id}</td>
                  <td className="px-4 py-3 font-medium">{group.group_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{group.permissions.length}개</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditTarget(group);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(group)}
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

      <GroupFormDialog
        open={formOpen}
        group={editTarget}
        permissionOptions={permissionOptions}
        onClose={() => setFormOpen(false)}
        onSaved={fetchData}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="그룹 삭제"
        description={`"${deleteTarget?.group_name}" 그룹을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
