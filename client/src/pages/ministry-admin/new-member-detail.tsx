import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { type NewMember } from "@shared/schema";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Globe,
  Users,
  Video,
  Cake,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface NewMemberCheckin {
  id: string;
  checkinDate: string;
  notes: string | null;
  outcome: string;
  nextFollowupDate: string | null;
  nextFollowupTime: string | null;
  videoLink: string | null;
  createdAt: string;
}

interface NewMemberWithCheckins extends NewMember {
  checkins: NewMemberCheckin[];
}

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  CONNECTED: "bg-coral/10 text-coral border-coral/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

const outcomeKeys: Record<string, string> = {
  CONNECTED: "newMemberDetail.outcomeConnected",
  NO_RESPONSE: "newMemberDetail.outcomeNoResponse",
  NEEDS_PRAYER: "newMemberDetail.outcomeNeedsPrayer",
  SCHEDULED_VISIT: "newMemberDetail.outcomeScheduledVisit",
  REFERRED: "newMemberDetail.outcomeReferred",
  OTHER: "newMemberDetail.outcomeOther",
};

export default function MinistryAdminNewMemberDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/ministry-admin/new-members/:id");
  const newMemberId = params?.id;

  const { data: newMember, isLoading } = useQuery<NewMemberWithCheckins>({
    queryKey: ["/api/ministry-admin/new-members", newMemberId],
    enabled: !!newMemberId,
  });

  const getOutcomeLabel = (outcome: string) => {
    const key = outcomeKeys[outcome];
    return key ? t(key) : outcome;
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('newMemberDetail.title')}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!newMember) {
    return (
      <DashboardLayout title={t('newMemberDetail.notFoundTitle')}>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">{t('newMemberDetail.notFound')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('newMemberDetail.notFoundDescription')}
            </p>
            <Link href="/ministry-admin/new-members">
              <Button>{t('newMemberDetail.backToNewMembers')}</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('newMemberDetail.title')}>
      <div className="space-y-6">
        <Link href="/ministry-admin/new-members">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            {t('newMemberDetail.backToNewMembers')}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {newMember.firstName} {newMember.lastName}
                </CardTitle>
                <CardDescription>
                  {t('newMemberDetail.joined')} {format(new Date(newMember.createdAt), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              <Badge className={statusColors[newMember.status]}>
                {newMember.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{t('newMemberDetail.contactInformation')}</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {newMember.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${newMember.phone}`} className="hover:underline">
                      {newMember.phone}
                    </a>
                  </div>
                )}
                {newMember.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${newMember.email}`} className="hover:underline">
                      {newMember.email}
                    </a>
                  </div>
                )}
                {newMember.address && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{newMember.address}</span>
                  </div>
                )}
                {newMember.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{newMember.country}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{t('newMemberDetail.personalDetails')}</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {newMember.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">{t('newMemberDetail.dateOfBirth')}</span>
                      {format(new Date(newMember.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {newMember.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">{t('newMemberDetail.gender')}</span>
                      {newMember.gender}
                    </span>
                  </div>
                )}
                {newMember.ageGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">{t('newMemberDetail.ageGroup')}</span>
                      {newMember.ageGroup}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {newMember.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{t('newMemberDetail.notes')}</h4>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {newMember.notes}
                  </p>
                </div>
              </>
            )}

            {newMember.selfSubmitted === "true" && (
              <>
                <Separator />
                <Badge variant="secondary" className="w-fit">
                  {t('newMemberDetail.selfSubmitted')}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('newMemberDetail.followUpTimeline')}</CardTitle>
            <CardDescription>
              {t('newMemberDetail.followUpHistory')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {newMember.checkins && newMember.checkins.length > 0 ? (
              <div className="space-y-4">
                {newMember.checkins.map((checkin) => (
                  <div key={checkin.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(checkin.checkinDate), "MMMM d, yyyy")}
                      <Badge variant="outline" className="ml-2">
                        {getOutcomeLabel(checkin.outcome)}
                      </Badge>
                    </div>
                    {checkin.notes && !checkin.notes.startsWith("Follow-up scheduled for") && !checkin.notes.startsWith("Mass follow-up scheduled for") && <p className="text-sm">{checkin.notes}</p>}
                    {checkin.nextFollowupDate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('newMemberDetail.nextFollowUp')} {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
                        {checkin.nextFollowupTime && <span> {t('newMemberDetail.at')} {(() => { const [h, m] = checkin.nextFollowupTime.split(':').map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}</span>}
                      </p>
                    )}
                    {checkin.videoLink && (
                      <a
                        href={checkin.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                      >
                        <Video className="h-3 w-3" />
                        {t('newMemberDetail.joinMeeting')}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('newMemberDetail.noFollowUpNotes')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
