import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useSortableTable<T>(data: T[] | undefined, defaultSort?: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: "", direction: null }
  );

  const requestSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: "", direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!data) return undefined;
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a: any, b: any) => {
      const aVal = getNestedValue(a, sortConfig.key);
      const bVal = getNestedValue(b, sortConfig.key);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === "asc" ? 1 : -1;
      if (bVal == null) return sortConfig.direction === "asc" ? -1 : 1;

      const aStr = String(aVal);
      const bStr = String(bVal);

      const aDate = parseDate(aStr);
      const bDate = parseDate(bStr);
      if (aDate && bDate) {
        return sortConfig.direction === "asc"
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum) && aStr.trim() !== "" && bStr.trim() !== "") {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      const comparison = aStr.localeCompare(bStr, undefined, { sensitivity: "base" });
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return { sortedData, sortConfig, requestSort };
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

function parseDate(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
