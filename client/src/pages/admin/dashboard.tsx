import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Platform Overview"
        description="Monitor all ministries, leaders, and converts across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="stats-grid">
        {[
          { label: "Total Ministries", value: stats?.totalChurches, icon: Church, testId: "text-total-churches" },
          { label: "Total Leaders", value: stats?.totalLeaders, icon: Users, testId: "text-total-leaders" },
          { label: "Total Converts", value: stats?.totalConverts, icon: UserPlus, testId: "text-total-converts", sub: stats?.convertsLast30Days },
          { label: "Follow-ups Due", value: stats?.followupsDue, icon: Calendar, testId: "text-followups-due" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border bg-card p-4">
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
                    {stat.sub || 0} in last 30 days
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Section title="Ministries">
          <p className="text-sm text-muted-foreground mb-3">Add, edit, and view ministry information</p>
          <Link href="/admin/churches">
            <Button size="sm" className="gap-1.5" data-testid="link-admin-churches">
              View Ministries
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Section>

        <Section title="Leaders">
          <p className="text-sm text-muted-foreground mb-3">Create and manage ministry leader accounts</p>
          <Link href="/admin/leaders">
            <Button size="sm" className="gap-1.5" data-testid="link-admin-leaders">
              View Leaders
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Section>

        <Section
          title="Prayer Requests"
          actions={
            stats && stats.recentPrayerRequests > 0 ? (
              <Badge variant="secondary">{stats.recentPrayerRequests} new</Badge>
            ) : undefined
          }
        >
          <p className="text-sm text-muted-foreground mb-3">View and respond to prayer requests</p>
          <Link href="/admin/prayer-requests">
            <Button size="sm" variant="outline" className="gap-1.5" data-testid="link-admin-prayer-requests">
              View Requests
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Section>
      </div>
    </DashboardLayout>
  );
}
