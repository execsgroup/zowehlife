import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Church, Users, UserPlus, Calendar, ArrowRight, TrendingUp, HandHeart } from "lucide-react";

interface DashboardStats {
  totalChurches: number;
  totalLeaders: number;
  totalConverts: number;
  convertsLast30Days: number;
  followupsDue: number;
  recentPrayerRequests: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <DashboardLayout>
      <PageHeader
        title={t('dashboard.platformOverview')}
        description={t('dashboard.platformDescription')}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="stats-grid">
        {[
          { label: t('dashboard.totalMinistries'), value: stats?.totalChurches, icon: Church, testId: "text-total-churches", href: "/admin/churches" },
          { label: t('dashboard.totalLeaders'), value: stats?.totalLeaders, icon: Users, testId: "text-total-leaders", href: "/admin/leaders" },
          { label: t('dashboard.totalConverts'), value: stats?.totalConverts, icon: UserPlus, testId: "text-total-converts", sub: stats?.convertsLast30Days, href: "/admin/converts" },
          { label: t('dashboard.followUpsDue'), value: stats?.followupsDue, icon: Calendar, testId: "text-followups-due", href: "/admin/converts" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} data-testid={`link-stat-${stat.testId}`}>
            <div className="rounded-md border bg-card p-4 cursor-pointer hover-elevate transition-colors">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <>
                  <div className="text-2xl font-semibold" data-testid={stat.testId}>
                    {stat.value || 0}
                  </div>
                  {stat.sub !== undefined && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.sub || 0} {t('dashboard.inLast30Days')}
                    </p>
                  )}
                </>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Section title={t('sidebar.ministries')}>
          <p className="text-sm text-muted-foreground mb-3">{t('dashboard.addEditViewMinistry')}</p>
          <Link href="/admin/churches">
            <Button size="sm" className="gap-1.5" data-testid="link-admin-churches">
              {t('dashboard.viewMinistries')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Section>

        <Section title={t('sidebar.leaders')}>
          <p className="text-sm text-muted-foreground mb-3">{t('dashboard.createManageLeaders')}</p>
          <Link href="/admin/leaders">
            <Button size="sm" className="gap-1.5" data-testid="link-admin-leaders">
              {t('dashboard.viewLeaders')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Section>

        <Section
          title={t('sidebar.prayerRequests')}
          actions={
            stats && stats.recentPrayerRequests > 0 ? (
              <Badge variant="secondary">{stats.recentPrayerRequests} {t('dashboard.new')}</Badge>
            ) : undefined
          }
        >
          <p className="text-sm text-muted-foreground mb-3">{t('dashboard.viewRespondPrayer')}</p>
          <Link href="/admin/prayer-requests">
            <Button size="sm" variant="outline" className="gap-1.5" data-testid="link-admin-prayer-requests">
              {t('dashboard.viewRequests')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Section>
      </div>
    </DashboardLayout>
  );
}
