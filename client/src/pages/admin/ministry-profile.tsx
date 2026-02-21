import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Users, UserPlus, Calendar, Heart, UserCheck, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { Church, Convert, NewMember, Member } from "@shared/schema";

interface SafeUser {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string | null;
  churchId: string | null;
  createdAt: string;
}

interface MinistryProfileData {
  church: Church;
  leaders: SafeUser[];
  ministryAdmin: SafeUser | null;
  converts: Convert[];
  newMembers: NewMember[];
  members: Member[];
  stats: {
    totalConverts: number;
    totalNewMembers: number;
    totalMembers: number;
    totalLeaders: number;
    convertsThisMonth: number;
    newMembersThisMonth: number;
    membersThisMonth: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
  }>;
}

export default function MinistryProfile() {
  const { t } = useTranslation();
  const [, params] = useRoute("/admin/ministry/:id");
  const [, navigate] = useLocation();
  const ministryId = params?.id;

  const { data: profile, isLoading } = useQuery<MinistryProfileData>({
    queryKey: ["/api/admin/ministry", ministryId],
    enabled: !!ministryId,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <Section>
          <div className="text-center py-12">
            <h2 className="text-sm font-semibold mb-2">{t('ministryProfile.ministryNotFound')}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t('ministryProfile.ministryNotFoundDesc')}</p>
            <Button onClick={() => navigate("/admin/churches")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('ministryProfile.backToMinistries')}
            </Button>
          </div>
        </Section>
      </DashboardLayout>
    );
  }

  const { church, leaders, ministryAdmin, converts, newMembers, members, stats, recentActivity } = profile;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/admin/churches")}
            data-testid="button-back-to-ministries"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <PageHeader
          title={church.name}
          description={`${church.location || t('ministryProfile.locationNotSpecified')} • ${t('ministryProfile.createdOn')} ${format(new Date(church.createdAt), "MMM d, yyyy")}`}
          actions={
            <Badge
              variant={church.plan === "stewardship" ? "default" : church.plan === "formation" ? "secondary" : "outline"}
              data-testid="badge-ministry-plan"
            >
              {church.plan ? t(`billing.${church.plan}`) : t('billing.foundations')} {t('ministryProfile.plan')}
            </Badge>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ministryProfile.totalConverts')}</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConverts}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.convertsThisMonth} {t('ministryProfile.thisMonth')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ministryProfile.newMembersGuests')}</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNewMembers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newMembersThisMonth} {t('ministryProfile.thisMonth')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ministryProfile.members')}</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.membersThisMonth} {t('ministryProfile.thisMonth')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ministryProfile.leaders')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeaders}</div>
              <p className="text-xs text-muted-foreground">
                {t('ministryProfile.activeTeamMembers')}
              </p>
            </CardContent>
          </Card>
        </div>

        {ministryAdmin && (
          <Section title={t('ministryProfile.ministryAdmin')} description={t('ministryProfile.ministryAdminDesc')}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {ministryAdmin.firstName?.[0]}{ministryAdmin.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{ministryAdmin.firstName} {ministryAdmin.lastName}</p>
                <p className="text-xs text-muted-foreground">{ministryAdmin.email || t('ministryProfile.noEmail')}</p>
              </div>
            </div>
          </Section>
        )}

        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity" data-testid="tab-activity">{t('ministryProfile.recentActivity')}</TabsTrigger>
            <TabsTrigger value="leaders" data-testid="tab-leaders">{t('ministryProfile.leaders')} ({leaders.length})</TabsTrigger>
            <TabsTrigger value="converts" data-testid="tab-converts">{t('adminConverts.title')} ({converts.length})</TabsTrigger>
            <TabsTrigger value="new-members" data-testid="tab-new-members">{t('ministryProfile.newMembersGuests')} ({newMembers.length})</TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">{t('ministryProfile.members')} ({members.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Section title={t('ministryProfile.recentActivity')} description={t('ministryProfile.recentActivityDesc')}>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Badge variant="secondary">{activity.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t('ministryProfile.noRecentActivity')}</p>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="leaders">
            <Section title={t('ministryProfile.ministryLeaders')} description={t('ministryProfile.ministryLeadersDesc')} noPadding>
              {leaders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.email')}</TableHead>
                      <TableHead>{t('forms.role')}</TableHead>
                      <TableHead>{t('ministryProfile.joined')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaders.map((leader) => (
                      <TableRow key={leader.id} data-testid={`row-leader-${leader.id}`}>
                        <TableCell className="text-sm font-medium">
                          {leader.firstName} {leader.lastName}
                        </TableCell>
                        <TableCell className="text-sm">{leader.email}</TableCell>
                        <TableCell>
                          <Badge variant={leader.role === "MINISTRY_ADMIN" ? "default" : "secondary"}>
                            {leader.role === "MINISTRY_ADMIN" ? t('ministryProfile.ministryAdmin') : t('leaders.title')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(leader.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t('ministryProfile.noLeaders')}</p>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="converts">
            <Section title={t('adminConverts.title')} description={t('ministryProfile.convertsDesc')} noPadding>
              {converts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.phone')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('ministryProfile.registered')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {converts.slice(0, 10).map((convert) => (
                      <TableRow key={convert.id} data-testid={`row-convert-${convert.id}`}>
                        <TableCell className="text-sm font-medium">
                          {convert.firstName} {convert.lastName}
                        </TableCell>
                        <TableCell className="text-sm">{convert.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={convert.status === "NEW" ? "default" : "secondary"}>
                            {t(`statusLabels.${convert.status?.toLowerCase().replace(/_/g, '')}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(convert.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t('ministryProfile.noConverts')}</p>
              )}
              {converts.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {t('ministryProfile.showingOf', { shown: 10, total: converts.length, type: t('adminConverts.title').toLowerCase() })}
                </p>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="new-members">
            <Section title={t('ministryProfile.newMembersGuests')} description={t('ministryProfile.newMembersGuestsDesc')} noPadding>
              {newMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.phone')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('ministryProfile.registered')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newMembers.slice(0, 10).map((nm) => (
                      <TableRow key={nm.id} data-testid={`row-new-member-${nm.id}`}>
                        <TableCell className="text-sm font-medium">
                          {nm.firstName} {nm.lastName}
                        </TableCell>
                        <TableCell className="text-sm">{nm.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={nm.status === "NEW" ? "default" : "secondary"}>
                            {t(`statusLabels.${nm.status?.toLowerCase().replace(/_/g, '')}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(nm.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t('ministryProfile.noNewMembers')}</p>
              )}
              {newMembers.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {t('ministryProfile.showingOf', { shown: 10, total: newMembers.length, type: t('ministryProfile.newMembersGuests').toLowerCase() })}
                </p>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="members">
            <Section title={t('ministryProfile.members')} description={t('ministryProfile.membersDesc')} noPadding>
              {members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.phone')}</TableHead>
                      <TableHead>{t('forms.email')}</TableHead>
                      <TableHead>{t('ministryProfile.memberSince')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.slice(0, 10).map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell className="text-sm">{member.phone || "-"}</TableCell>
                        <TableCell className="text-sm">{member.email || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {member.memberSince ? format(new Date(member.memberSince), "MMM yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t('ministryProfile.noMembers')}</p>
              )}
              {members.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {t('ministryProfile.showingOf', { shown: 10, total: members.length, type: t('ministryProfile.members').toLowerCase() })}
                </p>
              )}
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
