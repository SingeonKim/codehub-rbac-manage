"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // 표시할 페이지 번호 범위 계산 (현재 페이지 기준 ±2)
  const pageNumbers: number[] = [];
  for (
    let i = Math.max(1, page - 2);
    i <= Math.min(totalPages, page + 2);
    i++
  ) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-sm text-muted-foreground">
        총 {total.toLocaleString()}건 중 {start}–{end}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers[0] > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-8"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {pageNumbers[0] > 2 && (
              <span className="px-1 text-muted-foreground">…</span>
            )}
          </>
        )}

        {pageNumbers.map((n) => (
          <Button
            key={n}
            variant={n === page ? "default" : "outline"}
            size="sm"
            className="h-8 min-w-8"
            onClick={() => onPageChange(n)}
          >
            {n}
          </Button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-1 text-muted-foreground">…</span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-8"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
