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
import { Users, UserPlus, Heart, UserCheck, UsersRound, Copy, ExternalLink, QrCode } from "lucide-react";
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="stats-grid">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} data-testid={`link-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="rounded-md border bg-card p-4 cursor-pointer hover-elevate transition-colors">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <div className="text-2xl font-semibold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Section
        title={t('reports.chartsAndReports')}
        actions={
          <ExportCsvButton
            data={growthData || []}
            filename="growth-trends"
            headers={[t('reports.month'), t('reports.converts'), t('reports.newMembers'), t('reports.members')]}
          />
        }
      >
        <div className="space-y-4">
          <div className="rounded-md border p-4" data-testid="chart-growth-trends">
            <h3 className="text-sm font-medium mb-3">{t('reports.growthTrends')}</h3>
            {growthLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <GrowthTrendChart data={growthData || []} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4" data-testid="chart-status-breakdown">
              <h3 className="text-sm font-medium mb-3">{t('reports.statusBreakdown')}</h3>
              {statusLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <StatusBreakdownChart data={statusData || []} />
              )}
            </div>
            <div className="rounded-md border p-4" data-testid="chart-followup-stages">
              <h3 className="text-sm font-medium mb-3">{t('reports.followUpStages')}</h3>
              {stagesLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <FollowUpStageChart data={stagesData || []} />
              )}
            </div>
          </div>

          <div className="rounded-md border p-4" data-testid="chart-checkin-outcomes">
            <h3 className="text-sm font-medium mb-3">{t('reports.checkinOutcomes')}</h3>
            {outcomesLoading ? (
              <Skeleton className="h-[300px] w-full" />
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
              <div key={form.path} className="flex flex-col gap-2 p-3 rounded-md border">
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
