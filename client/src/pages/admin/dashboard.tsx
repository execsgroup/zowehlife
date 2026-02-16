import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Church, Users, UserPlus, Calendar, ArrowRight, TrendingUp } from "lucide-react";

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
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stats-grid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ministries</CardTitle>
              <Church className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-churches">
                  {stats?.totalChurches || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leaders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-leaders">
                  {stats?.totalLeaders || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Converts</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-converts">
                    {stats?.totalConverts || 0}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats?.convertsLast30Days || 0} in last 30 days
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-followups-due">
                  {stats?.followupsDue || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="text-lg">Manage Ministries</CardTitle>
              <CardDescription>
                Add, edit, and view ministry information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/churches">
                <Button className="gap-2" data-testid="link-admin-churches">
                  View Ministries
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="text-lg">Manage Leaders</CardTitle>
              <CardDescription>
                Create and manage ministry leader accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/leaders">
                <Button className="gap-2" data-testid="link-admin-leaders">
                  View Leaders
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Prayer Requests</CardTitle>
                {stats && stats.recentPrayerRequests > 0 && (
                  <Badge variant="secondary">{stats.recentPrayerRequests} new</Badge>
                )}
              </div>
              <CardDescription>
                View and respond to prayer requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/prayer-requests">
                <Button variant="outline" className="gap-2" data-testid="link-admin-prayer-requests">
                  View Requests
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
