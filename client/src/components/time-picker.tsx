import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function TimePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  "data-testid": testId,
}: TimePickerProps) {
  const { t } = useTranslation();

  const parseTime = (val: string | undefined): { hour: number; minute: number; period: "AM" | "PM" } => {
    if (!val) return { hour: 9, minute: 0, period: "AM" };
    const [h, m] = val.split(":").map(Number);
    const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour: hour12, minute: m, period };
  };

  const { hour, minute, period } = parseTime(value);

  const emitChange = (h: number, m: number, p: "AM" | "PM") => {
    let h24 = h;
    if (p === "PM" && h !== 12) h24 = h + 12;
    if (p === "AM" && h === 12) h24 = 0;
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const incrementHour = () => {
    const newHour = hour >= 12 ? 1 : hour + 1;
    emitChange(newHour, minute, period);
  };

  const decrementHour = () => {
    const newHour = hour <= 1 ? 12 : hour - 1;
    emitChange(newHour, minute, period);
  };

  const incrementMinute = () => {
    const newMinute = minute >= 55 ? 0 : minute + 5;
    emitChange(hour, newMinute, period);
  };

  const decrementMinute = () => {
    const newMinute = minute <= 0 ? 55 : minute - 5;
    emitChange(hour, newMinute, period);
  };

  const togglePeriod = () => {
    const newPeriod = period === "AM" ? "PM" : "AM";
    emitChange(hour, minute, newPeriod);
  };

  const hasValue = !!value;

  if (!hasValue) {
    return (
      <button
        type="button"
        onClick={() => emitChange(9, 0, "AM")}
        disabled={disabled}
        className={cn(
          "flex items-center w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        data-testid={testId}
      >
        <Clock className="mr-2 h-4 w-4" />
        <span>{placeholder || t('forms.pickTime')}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 w-full rounded-md border border-input bg-background px-2 py-1",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      data-testid={testId}
    >
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex items-center gap-0.5 flex-1 justify-center">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementHour}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            data-testid={testId ? `${testId}-hour-up` : undefined}
            tabIndex={-1}
          >
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span
            className="text-base font-semibold tabular-nums w-8 text-center select-none"
            data-testid={testId ? `${testId}-hour` : undefined}
          >
            {String(hour)}
          </span>
          <button
            type="button"
            onClick={decrementHour}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            data-testid={testId ? `${testId}-hour-down` : undefined}
            tabIndex={-1}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <span className="text-base font-semibold text-muted-foreground select-none">:</span>

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementMinute}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            data-testid={testId ? `${testId}-minute-up` : undefined}
            tabIndex={-1}
          >
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span
            className="text-base font-semibold tabular-nums w-8 text-center select-none"
            data-testid={testId ? `${testId}-minute` : undefined}
          >
            {String(minute).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={decrementMinute}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            data-testid={testId ? `${testId}-minute-down` : undefined}
            tabIndex={-1}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <button
          type="button"
          onClick={togglePeriod}
          className="ml-1 px-2 py-1 rounded-md text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors select-none"
          data-testid={testId ? `${testId}-period` : undefined}
        >
          {period}
        </button>
      </div>
    </div>
  );
}
