import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { Users, UserPlus, ClipboardList, Heart } from "lucide-react";

interface Stats {
  totalConverts: number;
  newConverts: number;
  totalLeaders: number;
  pendingAccountRequests: number;
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
      title: "New This Month",
      value: stats?.newConverts || 0,
      description: "Converts added this month",
      icon: UserPlus,
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
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {church?.name || "Ministry"} Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.fullName}. Manage your ministry and approve new leaders.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Ministry Overview</CardTitle>
            <CardDescription>
              As a Ministry Admin, you can approve leader account requests and view all converts and activity within your ministry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Approve Leaders</h3>
                  <p className="text-sm text-muted-foreground">
                    Review and approve requests from people who want to become leaders in your ministry.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">View Converts</h3>
                  <p className="text-sm text-muted-foreground">
                    See all converts registered in your ministry and their follow-up status.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
