import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Church, UserPlus, Calendar, ArrowRight, Clock, User, LinkIcon, Copy, Check, Video } from "lucide-react";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery<LeaderStats>({
    queryKey: ["/api/leader/stats"],
  });

  const { data: church } = useQuery<ChurchInfo>({
    queryKey: ["/api/leader/church"],
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
        title: "Link Copied",
        description: `The ${linkType} link has been copied to your clipboard.`,
      });
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const getFollowupBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Tomorrow</Badge>;
    }
    return null;
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="overflow-hidden">
          <div className="gradient-strip" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Church className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  Welcome back, {user?.firstName}!
                </h2>
                <p className="text-muted-foreground">
                  {isLoading ? (
                    <Skeleton className="h-4 w-48 mt-1" />
                  ) : (
                    <>Managing converts for <strong>{stats?.churchName}</strong></>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Converts</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-converts">
                  {stats?.totalConverts || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-new-converts">
                  {stats?.newConverts || 0}
                </div>
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
                  {stats?.followupsDue?.length || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shareable Links Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Shareable Registration Links</CardTitle>
                <CardDescription>
                  Share these links for self-registration forms
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Convert Form Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Salvation Form (Converts)</p>
              {church?.publicToken ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={convertFormLink}
                    className="font-mono text-sm"
                    data-testid="input-convert-form-link"
                  />
                  <Button
                    onClick={() => copyLink(convertFormLink, "convert form")}
                    variant="outline"
                    className="shrink-0 gap-2"
                    data-testid="button-copy-convert-link"
                  >
                    {copiedLink === "convert form" ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>

            {/* New Member Form Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium">New Member Form</p>
              {church?.newMemberToken ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={newMemberFormLink}
                    className="font-mono text-sm"
                    data-testid="input-new-member-form-link"
                  />
                  <Button
                    onClick={() => copyLink(newMemberFormLink, "new member form")}
                    variant="outline"
                    className="shrink-0 gap-2"
                    data-testid="button-copy-new-member-link"
                  >
                    {copiedLink === "new member form" ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>

            {/* Member Form Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Member Form</p>
              {church?.memberToken ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={memberFormLink}
                    className="font-mono text-sm"
                    data-testid="input-member-form-link"
                  />
                  <Button
                    onClick={() => copyLink(memberFormLink, "member form")}
                    variant="outline"
                    className="shrink-0 gap-2"
                    data-testid="button-copy-member-link"
                  >
                    {copiedLink === "member form" ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups Due */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Follow-ups</CardTitle>
                <CardDescription>
                  Converts that need to be checked in on
                </CardDescription>
              </div>
              <Link href="/leader/converts">
                <Button variant="outline" size="sm" className="gap-1" data-testid="link-view-all-converts">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats?.followupsDue && stats.followupsDue.length > 0 ? (
              <div className="space-y-3">
                {stats.followupsDue.slice(0, 5).map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  >
                    <Link href={`/leader/converts/${followup.convertId}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{followup.convertName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
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
                          Join Meeting
                        </Button>
                      )}
                      {getFollowupBadge(followup.nextFollowupDate)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No upcoming follow-ups scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Action */}
        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle className="text-lg">Add New Convert</CardTitle>
            <CardDescription>
              Record a new person who has accepted Christ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/leader/converts?new=true">
              <Button className="gap-2" data-testid="button-add-convert">
                <UserPlus className="h-4 w-4" />
                Add Convert
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
