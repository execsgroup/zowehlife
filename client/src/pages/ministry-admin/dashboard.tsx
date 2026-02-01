import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth";
import { Users, UserPlus, ClipboardList, Heart, UserCheck, UsersRound } from "lucide-react";

interface Stats {
  totalConverts: number;
  newConverts: number;
  totalLeaders: number;
  pendingAccountRequests: number;
  totalNewMembers: number;
  totalMembers: number;
}

interface Church {
  id: string;
  name: string;
  location: string | null;
  logoUrl: string | null;
}

export default function MinistryAdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/ministry-admin/stats"],
  });

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/ministry-admin/church"],
  });

  const statCards = [
    {
      title: "Total Converts",
      value: stats?.totalConverts || 0,
      description: "All converts in your ministry",
      icon: Heart,
    },
    {
      title: "New Converts",
      value: stats?.newConverts || 0,
      description: "Converts added this month",
      icon: UserPlus,
    },
    {
      title: "New Members",
      value: stats?.totalNewMembers || 0,
      description: "New members in your ministry",
      icon: UserCheck,
    },
    {
      title: "Members",
      value: stats?.totalMembers || 0,
      description: "Existing members in your ministry",
      icon: UsersRound,
    },
    {
      title: "Leaders",
      value: stats?.totalLeaders || 0,
      description: "Active leaders in your ministry",
      icon: Users,
    },
    {
      title: "Pending Requests",
      value: stats?.pendingAccountRequests || 0,
      description: "Leader requests awaiting approval",
      icon: ClipboardList,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {church?.name || "Ministry"} Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}. Manage your ministry and approve new leaders.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
