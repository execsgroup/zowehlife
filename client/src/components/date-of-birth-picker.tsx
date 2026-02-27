import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, es, fr, pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const localeMap: Record<string, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  pt: pt,
};

type Locale = typeof enUS;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 120;
const YEARS = Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, i) => CURRENT_YEAR - i);

interface DateOfBirthPickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
  "data-testid"?: string;
}

export function DateOfBirthPicker({
  value,
  onChange,
  disabled,
  maxDate = new Date(),
  minDate,
  className,
  "data-testid": testId,
}: DateOfBirthPickerProps) {
  const { t, i18n } = useTranslation();

  const parts = value ? value.split("-") : [];
  const parsedYear = parts[0] ? parseInt(parts[0], 10) : undefined;
  const parsedMonth = parts[1] ? parseInt(parts[1], 10) : undefined;
  const parsedDay = parts[2] ? parseInt(parts[2], 10) : undefined;

  // Keep local selection state so the UI shows the picked parts
  // even before a full YYYY-MM-DD value exists.
  const [year, setYear] = useState<number | undefined>(parsedYear);
  const [month, setMonth] = useState<number | undefined>(parsedMonth);
  const [day, setDay] = useState<number | undefined>(parsedDay);

  useEffect(() => {
    setYear(parsedYear);
    setMonth(parsedMonth);
    setDay(parsedDay);
  }, [parsedYear, parsedMonth, parsedDay]);

  const minYear = minDate ? minDate.getFullYear() : MIN_YEAR;
  const maxYear = maxDate ? maxDate.getFullYear() : CURRENT_YEAR;
  const yearOptions = useMemo(
    () => YEARS.filter((y) => y >= minYear && y <= maxYear),
    [minYear, maxYear]
  );

  const dayCount = useMemo(() => {
    if (month == null || year == null) return 31;
    return getDaysInMonth(year, month);
  }, [month, year]);

  const dayOptions = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount]
  );

  const emitIfComplete = (y?: number, m?: number, d?: number) => {
    if (y == null || m == null || d == null) return;
    const maxDay = getDaysInMonth(y, m);
    const safeDay = Math.min(d, maxDay);
    const next = `${String(y)}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    onChange(next);
    if (safeDay !== d) setDay(safeDay);
  };

  const handleMonthChange = (v: string) => {
    const nextMonth = v ? parseInt(v, 10) : undefined;
    setMonth(nextMonth);
    emitIfComplete(year, nextMonth, day);
  };

  const handleDayChange = (v: string) => {
    const nextDay = v ? parseInt(v, 10) : undefined;
    setDay(nextDay);
    emitIfComplete(year, month, nextDay);
  };

  const handleYearChange = (v: string) => {
    const nextYear = v ? parseInt(v, 10) : undefined;
    setYear(nextYear);
    emitIfComplete(nextYear, month, day);
  };

  const currentLocale = localeMap[i18n.language] || enUS;
  const monthLabel = (m: number) =>
    format(new Date(2000, m - 1, 1), "MMMM", { locale: currentLocale });

  return (
    <div
      className={cn("grid grid-cols-3 gap-2", className)}
      data-testid={testId}
    >
      <Select
        value={month != null ? String(month) : ""}
        onValueChange={handleMonthChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" data-testid={testId ? `${testId}-month` : undefined}>
          <SelectValue placeholder={t("forms.month")} />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <SelectItem key={m} value={String(m)}>
              {monthLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={day != null ? String(day) : ""}
        onValueChange={handleDayChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" data-testid={testId ? `${testId}-day` : undefined}>
          <SelectValue placeholder={t("forms.day")} />
        </SelectTrigger>
        <SelectContent>
          {dayOptions.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={year != null ? String(year) : ""}
        onValueChange={handleYearChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" data-testid={testId ? `${testId}-year` : undefined}>
          <SelectValue placeholder={t("forms.year")} />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
