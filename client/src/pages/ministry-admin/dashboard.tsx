import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { QRCodeDialog } from "@/components/qr-code-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  GrowthTrendChart,
  StatusBreakdownChart,
  FollowUpStageChart,
  CheckinOutcomeChart,
  ExportCsvButton,
} from "@/components/dashboard-charts";
import { Users, UserPlus, Heart, UserCheck, UsersRound, Copy, ExternalLink, QrCode, TrendingUp, BarChart3, PieChart, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";

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
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5" data-testid="chart-growth-trends">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <h3 className="text-sm font-semibold">{t('reports.growthTrends')}</h3>
            </div>
            {growthLoading ? (
              <Skeleton className="h-[280px] w-full rounded-md" />
            ) : (
              <GrowthTrendChart data={growthData || []} />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-5" data-testid="chart-status-breakdown">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10">
                  <PieChart className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <h3 className="text-sm font-semibold">{t('reports.statusBreakdown')}</h3>
              </div>
              {statusLoading ? (
                <Skeleton className="h-[250px] w-full rounded-md" />
              ) : (
                <StatusBreakdownChart data={statusData || []} />
              )}
            </div>
            <div className="rounded-lg border bg-card p-5" data-testid="chart-followup-stages">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold">{t('reports.followUpStages')}</h3>
              </div>
              {stagesLoading ? (
                <Skeleton className="h-[250px] w-full rounded-md" />
              ) : (
                <FollowUpStageChart data={stagesData || []} />
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5" data-testid="chart-checkin-outcomes">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
                <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold">{t('reports.checkinOutcomes')}</h3>
            </div>
            {outcomesLoading ? (
              <Skeleton className="h-[280px] w-full rounded-md" />
            ) : (
              <CheckinOutcomeChart data={outcomesData || []} />
            )}
          </div>
        </div>
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
