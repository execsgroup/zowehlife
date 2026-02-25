import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { QRCodeDialog } from "@/components/qr-code-dialog";
import { Table, TableBody, TableCell, TableRow, TableHeader } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useSortableTable } from "@/hooks/use-sortable-table";
import { SortableTableHead } from "@/components/sortable-table-head";
import {
  GrowthTrendChart,
  StatusBreakdownChart,
  FollowUpStageChart,
  CheckinOutcomeChart,
  ExportCsvButton,
} from "@/components/dashboard-charts";
import { Users, UserPlus, Heart, UserCheck, UsersRound, Copy, ExternalLink, QrCode, TrendingUp, BarChart3, PieChart, ClipboardCheck, UserCog, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface Stats {
  totalConverts: number;
  newConverts: number;
  totalLeaders: number;
  totalNewMembers: number;
  totalMembers: number;
}

interface Church {
  id: string;
  name: string;
  location: string | null;
  logoUrl: string | null;
  publicToken: string | null;
  newMemberToken: string | null;
  memberToken: string | null;
}

export default function MinistryAdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/ministry-admin/stats"],
  });

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/ministry-admin/church"],
  });

  const { data: growthData, isLoading: growthLoading } = useQuery<Array<{ month: string; converts: number; newMembers: number; members: number }>>({
    queryKey: ["/api/ministry-admin/reports", "growth"],
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<Array<{ status: string; count: number }>>({
    queryKey: ["/api/ministry-admin/reports", "status-breakdown"],
  });

  const { data: stagesData, isLoading: stagesLoading } = useQuery<Array<{ stage: string; count: number }>>({
    queryKey: ["/api/ministry-admin/reports", "followup-stages"],
  });

  const { data: outcomesData, isLoading: outcomesLoading } = useQuery<Array<{ outcome: string; count: number }>>({
    queryKey: ["/api/ministry-admin/reports", "checkin-outcomes"],
  });

  interface LeaderMetric {
    leaderId: string;
    leaderName: string;
    totalConverts: number;
    totalNewMembers: number;
    totalMembers: number;
    totalGuests: number;
    scheduledFollowups: number;
    completedFollowups: number;
    lastActivity: string | null;
  }

  const { data: leaderMetrics, isLoading: leaderMetricsLoading } = useQuery<LeaderMetric[]>({
    queryKey: ["/api/ministry-admin/reports", "leader-performance"],
  });

  const { sortedData: sortedLeaderMetrics, sortConfig: leaderSortConfig, requestSort: requestLeaderSort } = useSortableTable(leaderMetrics || []);

  const baseUrl = window.location.origin;

  const formLinks = [
    {
      title: t('dashboard.salvationForm'),
      description: t('dashboard.salvationFormDesc'),
      token: church?.publicToken,
      path: "connect",
    },
    {
      title: t('dashboard.newMemberForm'),
      description: t('dashboard.newMemberFormDesc'),
      token: church?.newMemberToken,
      path: "new-member",
    },
    {
      title: t('dashboard.memberForm'),
      description: t('dashboard.memberFormDesc'),
      token: church?.memberToken,
      path: "member",
    },
  ];

  const [qrDialog, setQrDialog] = useState<{ url: string; title: string } | null>(null);

  const copyToClipboard = (url: string, formName: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: t('dashboard.linkCopied'),
      description: t('dashboard.linkCopiedDesc', { name: formName }),
    });
  };

  const statCards = [
    { title: t('dashboard.totalConverts'), value: stats?.totalConverts || 0, icon: Heart, href: "/ministry-admin/converts" },
    { title: t('dashboard.newConverts'), value: stats?.newConverts || 0, icon: UserPlus, href: "/ministry-admin/converts" },
    { title: t('dashboard.newMembersGuestsCount'), value: stats?.totalNewMembers || 0, icon: UserCheck, href: "/ministry-admin/new-members" },
    { title: t('dashboard.membersCount'), value: stats?.totalMembers || 0, icon: UsersRound, href: "/ministry-admin/members" },
    { title: t('dashboard.leadersCount'), value: stats?.totalLeaders || 0, icon: Users, href: "/ministry-admin/leaders" },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={t('dashboard.ministryDashboard', { name: church?.name || 'Ministry' })}
        description={t('dashboard.welcomeBack', { name: user?.firstName })}
      />

      <div className="grid gap-2 grid-cols-3 lg:grid-cols-5" data-testid="stats-grid">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} data-testid={`link-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="rounded-lg border bg-card px-3 py-2.5 cursor-pointer hover-elevate transition-all">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 shrink-0">
                  <stat.icon className="h-3 w-3 text-primary" />
                </div>
                {statsLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <span className="text-lg font-bold tracking-tight" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-none mt-1 block">{stat.title}</span>
            </div>
          </Link>
        ))}
      </div>

      <Section
        title={t('reports.chartsAndReports')}
        actions={
          <ExportCsvButton
            data={growthData || []}
            filename="ministry-growth-report"
            headers={[t('reports.month'), t('reports.converts'), t('reports.newMembers'), t('reports.members')]}
          />
        }
        noPadding
      >
        <div className="p-3 space-y-3">
          <div className="rounded-md border bg-muted/30 p-3" data-testid="chart-growth-trends">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              <h3 className="text-xs font-semibold">{t('reports.growthTrends')}</h3>
            </div>
            {growthLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <GrowthTrendChart data={growthData || []} />
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-3" data-testid="chart-status-breakdown">
              <div className="flex items-center gap-1.5 mb-2">
                <PieChart className="h-3.5 w-3.5 text-violet-500" />
                <h3 className="text-xs font-semibold">{t('reports.statusBreakdown')}</h3>
              </div>
              {statusLoading ? (
                <Skeleton className="h-[180px] w-full rounded-md" />
              ) : (
                <StatusBreakdownChart data={statusData || []} />
              )}
            </div>
            <div className="rounded-md border bg-muted/30 p-3" data-testid="chart-followup-stages">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                <h3 className="text-xs font-semibold">{t('reports.followUpStages')}</h3>
              </div>
              {stagesLoading ? (
                <Skeleton className="h-[180px] w-full rounded-md" />
              ) : (
                <FollowUpStageChart data={stagesData || []} />
              )}
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3" data-testid="chart-checkin-outcomes">
            <div className="flex items-center gap-1.5 mb-2">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
              <h3 className="text-xs font-semibold">{t('reports.checkinOutcomes')}</h3>
            </div>
            {outcomesLoading ? (
              <Skeleton className="h-[200px] w-full rounded-md" />
            ) : (
              <CheckinOutcomeChart data={outcomesData || []} />
            )}
          </div>
        </div>
      </Section>

      <Section
        title={t('reports.leaderPerformance')}
        noPadding
        actions={
          <ExportCsvButton
            data={(leaderMetrics || []).map(l => ({
              [t('reports.leaderName')]: l.leaderName,
              [t('reports.totalConvertsCol')]: l.totalConverts,
              [t('reports.totalNewMembersCol')]: l.totalNewMembers,
              [t('reports.totalMembersCol')]: l.totalMembers,
              [t('reports.totalGuestsCol')]: l.totalGuests,
              [t('reports.scheduledFollowups')]: l.scheduledFollowups,
              [t('reports.completedFollowups')]: l.completedFollowups,
              [t('reports.lastActivity')]: l.lastActivity ? format(new Date(l.lastActivity), "MMM d, yyyy") : "—",
            }))}
            filename="leader-performance-report"
            headers={[
              t('reports.leaderName'), t('reports.totalConvertsCol'), t('reports.totalNewMembersCol'),
              t('reports.totalMembersCol'), t('reports.totalGuestsCol'),
              t('reports.scheduledFollowups'), t('reports.completedFollowups'), t('reports.lastActivity'),
            ]}
          />
        }
      >
        {leaderMetricsLoading ? (
          <div className="p-3">
            <Skeleton className="h-[200px] w-full rounded-md" />
          </div>
        ) : sortedLeaderMetrics.length === 0 ? (
          <div className="text-center py-8">
            <UserCog className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t('reports.noLeaderData')}</p>
          </div>
        ) : (
          <>
            <div className="p-3">
              <div className="rounded-md border bg-muted/30 p-3 mb-3" data-testid="chart-leader-performance">
                <div className="flex items-center gap-1.5 mb-2">
                  <UserCog className="h-3.5 w-3.5 text-indigo-500" />
                  <h3 className="text-xs font-semibold">{t('reports.totalRegistered')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sortedLeaderMetrics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="leaderName" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="totalConverts" name={t('reports.totalConvertsCol')} fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="totalNewMembers" name={t('reports.totalNewMembersCol')} fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="totalMembers" name={t('reports.totalMembersCol')} fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="totalGuests" name={t('reports.totalGuestsCol')} fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label={t('reports.leaderName')} sortKey="leaderName" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.totalConvertsCol')} sortKey="totalConverts" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.totalNewMembersCol')} sortKey="totalNewMembers" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.totalMembersCol')} sortKey="totalMembers" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.totalGuestsCol')} sortKey="totalGuests" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.scheduledFollowups')} sortKey="scheduledFollowups" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.completedFollowups')} sortKey="completedFollowups" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                    <SortableTableHead label={t('reports.lastActivity')} sortKey="lastActivity" sortConfig={leaderSortConfig} onSort={requestLeaderSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderMetrics.map((leader) => (
                    <TableRow key={leader.leaderId} data-testid={`row-leader-performance-${leader.leaderId}`}>
                      <TableCell className="font-medium" data-testid={`text-leader-name-${leader.leaderId}`}>{leader.leaderName}</TableCell>
                      <TableCell data-testid={`text-leader-converts-${leader.leaderId}`}>{leader.totalConverts}</TableCell>
                      <TableCell data-testid={`text-leader-newmembers-${leader.leaderId}`}>{leader.totalNewMembers}</TableCell>
                      <TableCell data-testid={`text-leader-members-${leader.leaderId}`}>{leader.totalMembers}</TableCell>
                      <TableCell data-testid={`text-leader-guests-${leader.leaderId}`}>{leader.totalGuests}</TableCell>
                      <TableCell data-testid={`text-leader-scheduled-${leader.leaderId}`}>
                        <Badge variant="outline">{leader.scheduledFollowups}</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-leader-completed-${leader.leaderId}`}>
                        <Badge variant="secondary">{leader.completedFollowups}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs" data-testid={`text-leader-lastactivity-${leader.leaderId}`}>
                        {leader.lastActivity ? format(new Date(leader.lastActivity), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      <Section title={t('dashboard.shareableFormLinks')} description={t('dashboard.shareFormLinksDesc')}>
        <div className="space-y-3">
          {formLinks.map((form) => {
            const url = form.token ? `${baseUrl}/${form.path}/${form.token}` : null;
            return (
              <div key={form.path} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                <div>
                  <h4 className="text-sm font-medium">{form.title}</h4>
                  <p className="text-xs text-muted-foreground">{form.description}</p>
                </div>
                {url ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2.5 py-1.5 text-xs bg-muted rounded-md border truncate" data-testid={`text-${form.path}-link`}>
                      {url}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(url, form.title)}
                      data-testid={`button-copy-${form.path}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.open(url, "_blank")}
                      data-testid={`button-open-${form.path}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setQrDialog({ url, title: form.title })}
                      data-testid={`button-qr-${form.path}`}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t('dashboard.linkNotAvailable')}</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {qrDialog && (
        <QRCodeDialog
          open={!!qrDialog}
          onOpenChange={(open) => !open && setQrDialog(null)}
          url={qrDialog.url}
          title={qrDialog.title}
        />
      )}
    </DashboardLayout>
  );
}
