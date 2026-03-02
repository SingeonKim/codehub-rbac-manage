"use client";

/**
 * M:M 관계 추가/제거 컴포넌트
 *
 * 예) 유저에 그룹 추가/제거, 그룹에 권한 추가/제거 등에 재사용된다.
 * 현재 선택된 항목은 Badge로 표시하고 X 버튼으로 제거한다.
 * 추가할 항목은 Command(검색 가능 드롭다운)로 선택한다.
 */

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface RelationOption {
  id: number;
  label: string;
  /** defaultUser 그룹처럼 선택 불가 항목에 설정 */
  disabled?: boolean;
  disabledReason?: string;
}

interface RelationManagerProps {
  label: string;
  selectedIds: number[];
  options: RelationOption[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

export function RelationManager({
  label,
  selectedIds,
  options,
  onChange,
  placeholder = "항목 추가...",
}: RelationManagerProps) {
  const [open, setOpen] = useState(false);

  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));
  const availableOptions = options.filter((o) => !selectedIds.includes(o.id));

  const handleSelect = (id: number) => {
    onChange([...selectedIds, id]);
    setOpen(false);
  };

  const handleRemove = (id: number) => {
    onChange(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      {/* 선택된 항목 태그 목록 */}
      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-md border bg-white p-2">
        {selectedOptions.length === 0 && (
          <span className="text-sm text-muted-foreground">없음</span>
        )}
        {selectedOptions.map((opt) => (
          <Badge
            key={opt.id}
            variant="secondary"
            className="flex items-center gap-1 pl-2 pr-1"
          >
            {opt.label}
            <button
              onClick={() => handleRemove(opt.id)}
              className="ml-1 rounded-sm opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* 항목 추가 드롭다운 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="검색..." />
            <CommandList>
              <CommandEmpty>결과 없음</CommandEmpty>
              <CommandGroup>
                {availableOptions.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.label}
                    onSelect={() => !opt.disabled && handleSelect(opt.id)}
                    className={cn(opt.disabled && "cursor-not-allowed opacity-50")}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    <span className="flex-1">{opt.label}</span>
                    {opt.disabled && opt.disabledReason && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {opt.disabledReason}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
