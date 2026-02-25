import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ChevronRight, 
  LogOut, 
  User, 
  Church, 
  Calendar,
  HandHeart,
  BookOpen,
  Video,
  ExternalLink,
  Loader2 
} from "lucide-react";
import zowehLogoPath from "@assets/ChatGPT_Image_Feb_24,_2026,_10_13_39_PM_1771989231984.png";

interface MemberProfile {
  person: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  accountStatus: string;
  affiliations: {
    id: string;
    ministryId: string;
    ministryName: string;
    relationshipType: string;
  }[];
  currentMinistry: {
    id: string;
    name: string;
  } | null;
}

interface JourneyItem {
  ministryId: string;
  ministryName: string;
  relationshipType: string;
  joinedAt: string;
  record: {
    id: string;
    createdAt: string;
    status?: string;
  } | null;
}

interface FollowUp {
  id: string;
  scheduledDate: string;
  nextFollowupTime: string | null;
  status: string;
  completedAt: string | null;
  videoLink: string | null;
  nextFollowupDate: string | null;
}

export default function MemberDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<MemberProfile>({
    queryKey: ["/api/member/me"],
  });

  const { data: journeyData, isLoading: journeyLoading } = useQuery<{ journey: JourneyItem[] }>({
    queryKey: ["/api/member/journey"],
    enabled: !!profile,
  });

  const { data: prayerRequests } = useQuery<any[]>({
    queryKey: ["/api/member/prayer-requests"],
    enabled: !!profile,
  });

  const { data: followUpsData } = useQuery<{ followUps: FollowUp[] }>({
    queryKey: ["/api/member/follow-ups"],
    enabled: !!profile,
  });

  if (profileError) {
    setLocation("/member-portal/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/member/logout");
      queryClient.invalidateQueries({ queryKey: ["/api/member/me"] });
      setLocation("/member-portal/login");
    } catch (error) {
      toast({
        title: t('memberPortal.logoutFailed'),
        description: t('memberPortal.logoutFailedDesc'),
        variant: "destructive",
      });
    }
  };

  const handleSwitchMinistry = async (ministryId: string) => {
    try {
      await apiRequest("POST", "/api/member/switch-ministry", { ministryId });
      queryClient.invalidateQueries({ queryKey: ["/api/member/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/journey"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/follow-ups"] });
      toast({
        title: t('memberPortal.ministrySwitched'),
        description: t('memberPortal.ministrySwitchedDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('memberPortal.switchFailed'),
        description: error.message || t('memberPortal.switchFailedDesc'),
        variant: "destructive",
      });
    }
  };

  const getRelationshipBadge = (type: string) => {
    switch (type) {
      case "convert":
        return <Badge variant="secondary">{t('memberPortal.newBeliever')}</Badge>;
      case "new_member":
        return <Badge variant="secondary">{t('memberPortal.newMemberGuest')}</Badge>;
      case "member":
        return <Badge variant="default">{t('memberPortal.member')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-muted p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={zowehLogoPath} alt="Zoweh Life" className="h-10 object-contain dark:invert dark:brightness-200 transition-[filter] duration-300" />
            <div>
              <h1 className="text-2xl font-bold">
                {t('memberPortal.welcomeMessage', { name: profile?.person.firstName })}
              </h1>
              <p className="text-muted-foreground text-sm">{profile?.person.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-member-logout">
            <LogOut className="h-4 w-4 mr-2" />
            {t('auth.signOut')}
          </Button>
        </div>

        {profile?.affiliations && profile.affiliations.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Church className="h-5 w-5" />
                {t('memberPortal.currentMinistry')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={profile.currentMinistry?.id || ""}
                onValueChange={handleSwitchMinistry}
              >
                <SelectTrigger className="w-full" data-testid="select-ministry">
                  <SelectValue placeholder={t('forms.selectMinistry')} />
                </SelectTrigger>
                <SelectContent>
                  {profile.affiliations.map((aff) => (
                    <SelectItem key={aff.ministryId} value={aff.ministryId}>
                      {aff.ministryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/member-portal/journey">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('memberPortal.myJourney')}</CardTitle>
                    <CardDescription>{t('memberPortal.viewJourney')}</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>

          <Link href="/member-portal/prayer-requests">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <HandHeart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('memberPortal.prayerRequests')}</CardTitle>
                    <CardDescription>
                      {t('memberPortal.requestsSubmitted', { count: prayerRequests?.length || 0 })}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>

          <Link href="/member-portal/journal">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('memberPortal.journal')}</CardTitle>
                    <CardDescription>
                      {t('memberPortal.personalReflections')}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Upcoming Follow-ups Section */}
        {followUpsData?.followUps && followUpsData.followUps.filter(fu => fu.status !== "COMPLETED").length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {t('memberPortal.upcomingFollowUps')}
              </CardTitle>
              <CardDescription>
                {t('memberPortal.scheduledSessions')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {followUpsData.followUps
                  .filter(fu => fu.status !== "COMPLETED")
                  .map((followUp) => (
                    <div
                      key={followUp.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(followUp.scheduledDate).toLocaleDateString(undefined, {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                            {followUp.nextFollowupTime && (() => { const [h, m] = followUp.nextFollowupTime!.split(':').map(Number); return ` at ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('memberPortal.scheduledSession')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {followUp.videoLink && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-join-video-${followUp.id}`}
                          >
                            <a 
                              href={followUp.videoLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Video className="h-4 w-4 mr-1" />
                              {t('dashboard.join')}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                        <Badge variant="secondary">{t('common.scheduled')}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('memberPortal.myMinistryConnections')}
            </CardTitle>
            <CardDescription>
              {t('memberPortal.affiliationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {journeyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : journeyData?.journey && journeyData.journey.length > 0 ? (
              <div className="space-y-3">
                {journeyData.journey.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div className="flex items-center gap-3">
                      <Church className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.ministryName}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('forms.joined')} {new Date(item.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getRelationshipBadge(item.relationshipType)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('memberPortal.noMinistryConnections')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
