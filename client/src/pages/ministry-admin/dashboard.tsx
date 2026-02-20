import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { QRCodeDialog } from "@/components/qr-code-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Heart, UserCheck, UsersRound, Link, Copy, ExternalLink, QrCode } from "lucide-react";

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

  const [qrDialog, setQrDialog] = useState<{ url: string; title: string } | null>(null);

  const copyToClipboard = (url: string, formName: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: `${formName} link copied to clipboard`,
    });
  };

  const statCards = [
    { title: "Total Converts", value: stats?.totalConverts || 0, icon: Heart },
    { title: "New Converts", value: stats?.newConverts || 0, icon: UserPlus },
    { title: "New Members & Guests", value: stats?.totalNewMembers || 0, icon: UserCheck },
    { title: "Members", value: stats?.totalMembers || 0, icon: UsersRound },
    { title: "Leaders", value: stats?.totalLeaders || 0, icon: Users },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={`${church?.name || "Ministry"} Dashboard`}
        description={`Welcome back, ${user?.firstName}. Manage your ministry and approve new leaders.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="stats-grid">
        {statCards.map((stat) => (
          <div key={stat.title} className="rounded-md border bg-card p-4">
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
        ))}
      </div>

      <Section title="Shareable Form Links" description="Share these links to allow people to register directly">
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
                  <p className="text-xs text-muted-foreground italic">Link not available</p>
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
