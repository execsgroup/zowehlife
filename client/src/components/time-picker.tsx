import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [open, setOpen] = useState(false);

  const parseTime = (val: string | undefined) => {
    if (!val) return { hour: "9", minute: "00", period: "AM" };
    const [h, m] = val.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour: String(hour12), minute: String(m).padStart(2, "0"), period };
  };

  const formatDisplay = (val: string | undefined) => {
    if (!val) return null;
    const { hour, minute, period } = parseTime(val);
    return `${hour}:${minute} ${period}`;
  };

  const handleChange = (hour: string, minute: string, period: string) => {
    let h = parseInt(hour);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const timeStr = `${String(h).padStart(2, "0")}:${minute}`;
    onChange(timeStr);
  };

  const { hour, minute, period } = parseTime(value);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplay(value) || <span>{placeholder || t('forms.pickTime')}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('forms.hour')}</label>
            <Select value={hour} onValueChange={(h) => handleChange(h, minute, period)}>
              <SelectTrigger className="w-[70px]" data-testid={testId ? `${testId}-hour` : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-lg font-medium mt-5">:</span>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('forms.minute')}</label>
            <Select value={minute} onValueChange={(m) => handleChange(hour, m, period)}>
              <SelectTrigger className="w-[70px]" data-testid={testId ? `${testId}-minute` : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
            <Select value={period} onValueChange={(p) => handleChange(hour, minute, p)}>
              <SelectTrigger className="w-[70px]" data-testid={testId ? `${testId}-period` : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">{t('forms.am')}</SelectItem>
                <SelectItem value="PM">{t('forms.pm')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
