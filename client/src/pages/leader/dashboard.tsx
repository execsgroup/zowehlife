import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { QRCodeDialog } from "@/components/qr-code-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { UserPlus, Calendar, ArrowRight, Clock, User, Copy, Check, Video, QrCode } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";

interface LeaderStats {
  churchName: string;
  totalConverts: number;
  newConverts: number;
  activeConverts: number;
  followupsDue: Array<{
    id: string;
    convertId: string;
    convertName: string;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    videoLink: string | null;
  }>;
}

interface ChurchInfo {
  id: string;
  name: string;
  publicToken: string;
  newMemberToken: string | null;
  memberToken: string | null;
}

export default function LeaderDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const apiBasePath = useApiBasePath();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [qrDialog, setQrDialog] = useState<{ url: string; title: string } | null>(null);

  const { data: stats, isLoading } = useQuery<LeaderStats>({
    queryKey: [`${apiBasePath}/stats`],
  });

  const { data: church } = useQuery<ChurchInfo>({
    queryKey: [`${apiBasePath}/church`],
  });

  const convertFormLink = church?.publicToken
    ? `${window.location.origin}/connect/${church.publicToken}`
    : "";

  const newMemberFormLink = church?.newMemberToken
    ? `${window.location.origin}/new-member/${church.newMemberToken}`
    : "";

  const memberFormLink = church?.memberToken
    ? `${window.location.origin}/member/${church.memberToken}`
    : "";

  const copyLink = async (link: string, linkType: string) => {
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopiedLink(linkType);
      toast({
        title: t('dashboard.linkCopied'),
        description: t('dashboard.linkCopiedDesc', { name: linkType }),
      });
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const getFollowupBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">{t('dashboard.overdue')}</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="secondary" className="text-xs">{t('dashboard.today')}</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="outline" className="text-xs">{t('dashboard.tomorrow')}</Badge>;
    }
    return null;
  };

  const formLinks = [
    { label: t('dashboard.salvationFormConverts'), link: convertFormLink, token: church?.publicToken, type: "convert form" },
    { label: t('dashboard.newMemberForm'), link: newMemberFormLink, token: church?.newMemberToken, type: "new member form" },
    { label: t('dashboard.memberForm'), link: memberFormLink, token: church?.memberToken, type: "member form" },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={t('sidebar.dashboard')}
        description={isLoading ? undefined : t('dashboard.managingConverts', { name: stats?.churchName || 'your ministry' })}
        actions={
          <Link href="/leader/converts?new=true">
            <Button size="sm" className="gap-1.5" data-testid="button-add-convert">
              <UserPlus className="h-3.5 w-3.5" />
              {t('dashboard.addConvert')}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3" data-testid="stats-grid">
        {[
          { label: t('dashboard.totalConverts'), value: stats?.totalConverts, icon: UserPlus, testId: "text-total-converts", href: "/leader/converts" },
          { label: t('dashboard.newThisMonth'), value: stats?.newConverts, icon: User, testId: "text-new-converts", href: "/leader/converts" },
          { label: t('dashboard.followUpsDue'), value: stats?.followupsDue?.length, icon: Calendar, testId: "text-followups-due", href: "/leader/followups" },
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
                <div className="text-2xl font-semibold" data-testid={stat.testId}>
                  {stat.value || 0}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Section title={t('dashboard.shareableRegistrationLinks')} description={t('dashboard.shareRegistrationLinksDesc')}>
        <div className="space-y-3">
          {formLinks.map((form) => (
            <div key={form.type} className="space-y-1.5">
              <p className="text-sm font-medium">{form.label}</p>
              {form.token ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={form.link}
                    className="font-mono text-xs"
                    data-testid={`input-${form.type.replace(/\s/g, '-')}-link`}
                  />
                  <Button
                    onClick={() => copyLink(form.link, form.type)}
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    data-testid={`button-copy-${form.type.replace(/\s/g, '-')}`}
                  >
                    {copiedLink === form.type ? (
                      <><Check className="h-3.5 w-3.5" /> {t('dashboard.copied')}</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> {t('dashboard.copy')}</>
                    )}
                  </Button>
                  <Button
                    onClick={() => setQrDialog({ url: form.link, title: form.label })}
                    variant="outline"
                    size="icon"
                    data-testid={`button-qr-${form.type.replace(/\s/g, '-')}`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Skeleton className="h-9 w-full" />
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('dashboard.upcomingFollowUps')}
        description={t('dashboard.upcomingFollowUpsDesc')}
        actions={
          <Link href="/leader/converts">
            <Button variant="outline" size="sm" className="gap-1" data-testid="link-view-all-converts">
              {t('dashboard.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        }
      >
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : stats?.followupsDue && stats.followupsDue.length > 0 ? (
          <div className="space-y-2">
            {stats.followupsDue.slice(0, 5).map((followup) => (
              <div
                key={followup.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md border hover-elevate"
              >
                <Link href={`/leader/converts/${followup.convertId}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{followup.convertName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(followup.nextFollowupDate), "EEEE, MMM d")}
                      {followup.nextFollowupTime && (() => { const [h, m] = followup.nextFollowupTime!.split(':').map(Number); return ` at ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {followup.videoLink && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(followup.videoLink!, "_blank");
                      }}
                      data-testid={`button-join-meeting-${followup.id}`}
                    >
                      <Video className="h-3 w-3" />
                      {t('dashboard.join')}
                    </Button>
                  )}
                  {getFollowupBadge(followup.nextFollowupDate)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t('dashboard.noUpcomingFollowUps')}</p>
          </div>
        )}
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
