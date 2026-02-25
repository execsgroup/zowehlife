import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortConfig } from "@/hooks/use-sortable-table";

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function SortableTableHead({
  label,
  sortKey,
  sortConfig,
  onSort,
  className,
  ...props
}: SortableTableHeadProps) {
  const isActive = sortConfig.key === sortKey && sortConfig.direction !== null;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 cursor-pointer select-none hover:text-foreground transition-colors",
        className
      )}
      onClick={() => onSort(sortKey)}
      data-testid={props["data-testid"]}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : direction === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  );
}
