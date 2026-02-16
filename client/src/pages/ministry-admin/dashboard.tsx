import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, ClipboardList, Heart, UserCheck, UsersRound, Link, Copy, ExternalLink } from "lucide-react";

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
  publicToken: string | null;
  newMemberToken: string | null;
  memberToken: string | null;
}

export default function MinistryAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/ministry-admin/stats"],
  });

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/ministry-admin/church"],
  });

  const baseUrl = window.location.origin;

  const formLinks = [
    {
      title: "Salvation Form",
      description: "Share this link at evangelism events for new converts",
      token: church?.publicToken,
      path: "connect",
    },
    {
      title: "New Member Form",
      description: "Share this link for new members joining the church",
      token: church?.newMemberToken,
      path: "new-member",
    },
    {
      title: "Member Form",
      description: "Share this link for existing members to register",
      token: church?.memberToken,
      path: "member",
    },
  ];

  const copyToClipboard = (url: string, formName: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: `${formName} link copied to clipboard`,
    });
  };

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
        <Card className="overflow-hidden">
          <div className="gradient-strip" />
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {church?.name || "Ministry"} Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName}. Manage your ministry and approve new leaders.
            </p>
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Shareable Form Links
            </CardTitle>
            <CardDescription>
              Share these links to allow people to register directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formLinks.map((form) => {
              const url = form.token ? `${baseUrl}/${form.path}/${form.token}` : null;
              return (
                <div key={form.path} className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-medium">{form.title}</h4>
                      <p className="text-sm text-muted-foreground">{form.description}</p>
                    </div>
                  </div>
                  {url ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 text-sm bg-background rounded border truncate" data-testid={`text-${form.path}-link`}>
                        {url}
                      </code>
                      <Button
                        size="icon"
                        variant="default"
                        onClick={() => copyToClipboard(url, form.title)}
                        data-testid={`button-copy-${form.path}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="default"
                        onClick={() => window.open(url, "_blank")}
                        data-testid={`button-open-${form.path}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Link not available</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
