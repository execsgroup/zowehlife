import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const CHART_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(346, 77%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(47, 96%, 53%)",
  "hsl(173, 80%, 40%)",
  "hsl(291, 64%, 42%)",
  "hsl(14, 100%, 57%)",
  "hsl(210, 40%, 60%)",
];

interface GrowthTrendData {
  month: string;
  converts: number;
  newMembers: number;
  members: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface StageData {
  stage: string;
  count: number;
}

interface OutcomeData {
  outcome: string;
  count: number;
}

const STATUS_LABEL_MAP: Record<string, string> = {
  NEW: "reports.statusNew",
  SCHEDULED: "reports.statusScheduled",
  CONNECTED: "reports.statusConnected",
  NO_RESPONSE: "reports.statusNoResponse",
  NEEDS_PRAYER: "reports.statusNeedsPrayer",
  REFERRED: "reports.statusReferred",
  NOT_COMPLETED: "reports.statusNotCompleted",
  NEVER_CONTACTED: "reports.statusNeverContacted",
  ACTIVE: "reports.statusActive",
  IN_PROGRESS: "reports.statusInProgress",
  INACTIVE: "reports.statusInactive",
};

const STAGE_LABEL_MAP: Record<string, string> = {
  NEW: "reports.stageNotStarted",
  CONTACT_NEW_MEMBER: "reports.stageNeedsContact",
  SCHEDULED: "reports.stage1stScheduled",
  FIRST_COMPLETED: "reports.stage1stCompleted",
  INITIATE_SECOND: "reports.stageReadyFor2nd",
  SECOND_SCHEDULED: "reports.stage2ndScheduled",
  SECOND_COMPLETED: "reports.stage2ndCompleted",
  INITIATE_FINAL: "reports.stageReadyForFinal",
  FINAL_SCHEDULED: "reports.stageFinalScheduled",
  FINAL_COMPLETED: "reports.stageCompleted",
};

const OUTCOME_LABEL_MAP: Record<string, string> = {
  CONNECTED: "reports.outcomeConnected",
  NO_RESPONSE: "reports.outcomeNoResponse",
  NEEDS_PRAYER: "reports.outcomeNeedsPrayer",
  SCHEDULED_VISIT: "reports.outcomeScheduledVisit",
  REFERRED: "reports.outcomeReferred",
  OTHER: "reports.outcomeOther",
  NOT_COMPLETED: "reports.outcomeNotCompleted",
  NEEDS_FOLLOWUP: "reports.outcomeNeedsFollowup",
};

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function GrowthTrendChart({ data }: { data: GrowthTrendData[] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return <EmptyChart message={t("reports.noDataAvailable")} />;
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorConverts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorNewMembers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            color: "hsl(var(--foreground))",
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="converts"
          name={t("reports.converts")}
          stroke={CHART_COLORS[0]}
          fillOpacity={1}
          fill="url(#colorConverts)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="newMembers"
          name={t("reports.newMembers")}
          stroke={CHART_COLORS[1]}
          fillOpacity={1}
          fill="url(#colorNewMembers)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="members"
          name={t("reports.members")}
          stroke={CHART_COLORS[2]}
          fillOpacity={1}
          fill="url(#colorMembers)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusBreakdownChart({ data }: { data: StatusData[] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return <EmptyChart message={t("reports.noDataAvailable")} />;
  }

  const formatted = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      ...d,
      label: t(STATUS_LABEL_MAP[d.status] || d.status),
    }));

  const total = formatted.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="count"
            nameKey="label"
          >
            {formatted.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number, name: string) => [
              `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 justify-center sm:flex-col sm:gap-1.5">
        {formatted.map((item, i) => (
          <div key={item.status} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FollowUpStageChart({ data }: { data: StageData[] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return <EmptyChart message={t("reports.noDataAvailable")} />;
  }

  const formatted = data.map((d) => ({
    ...d,
    label: t(STAGE_LABEL_MAP[d.stage] || d.stage),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, formatted.length * 40)}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} className="text-xs" allowDecimals={false} />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            color: "hsl(var(--foreground))",
          }}
        />
        <Bar dataKey="count" name={t("reports.count")} fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CheckinOutcomeChart({ data }: { data: OutcomeData[] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return <EmptyChart message={t("reports.noDataAvailable")} />;
  }

  const formatted = data
    .filter((d) => d.count > 0)
    .map((d, i) => ({
      ...d,
      label: t(OUTCOME_LABEL_MAP[d.outcome] || d.outcome),
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} className="text-xs" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            color: "hsl(var(--foreground))",
          }}
        />
        <Bar dataKey="count" name={t("reports.count")} radius={[4, 4, 0, 0]} barSize={32}>
          {formatted.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function ExportCsvButton({
  data,
  filename,
  headers,
}: {
  data: Record<string, any>[];
  filename: string;
  headers: string[];
}) {
  const { t } = useTranslation();

  const handleExport = () => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvHeader = headers.join(",");
    const csvRows = data.map((row) =>
      keys.map((k) => {
        const val = row[k];
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="gap-1.5"
      data-testid="button-export-csv"
    >
      <Download className="h-3.5 w-3.5" />
      {t("reports.exportCsv")}
    </Button>
  );
}
