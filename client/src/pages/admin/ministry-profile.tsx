import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [, params] = useRoute("/admin/ministry/:id");
  const [, navigate] = useLocation();
  const ministryId = params?.id;

  const { data: profile, isLoading } = useQuery<MinistryProfileData>({
    queryKey: ["/api/admin/ministry", ministryId],
    enabled: !!ministryId,
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Ministry Profile">
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
      <DashboardLayout title="Ministry Profile">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Ministry not found</h2>
          <p className="text-muted-foreground mb-4">The ministry you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/admin/churches")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ministries
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { church, leaders, ministryAdmin, converts, newMembers, members, stats, recentActivity } = profile;

  return (
    <DashboardLayout title={church.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/admin/churches")}
              data-testid="button-back-to-ministries"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{church.name}</h2>
              <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{church.location || "Location not specified"}</span>
                <span className="mx-2">•</span>
                <Calendar className="h-4 w-4" />
                <span>Created {format(new Date(church.createdAt), "MMM d, yyyy")}</span>
                <span className="mx-2">•</span>
                <Badge
                  variant={church.plan === "stewardship" ? "default" : church.plan === "formation" ? "secondary" : "outline"}
                  data-testid="badge-ministry-plan"
                >
                  {church.plan ? church.plan.charAt(0).toUpperCase() + church.plan.slice(1) : "Foundations"} Plan
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Converts</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConverts}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.convertsThisMonth} this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Members</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNewMembers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newMembersThisMonth} this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.membersThisMonth} this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leaders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeaders}</div>
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
            </CardContent>
          </Card>
        </div>

        {ministryAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ministry Admin
              </CardTitle>
              <CardDescription>Account administrator for this ministry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-lg font-semibold">
                    {ministryAdmin.firstName?.[0]}{ministryAdmin.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{ministryAdmin.firstName} {ministryAdmin.lastName}</p>
                  <p className="text-sm text-muted-foreground">{ministryAdmin.email || "No email"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity" data-testid="tab-activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="leaders" data-testid="tab-leaders">Leaders ({leaders.length})</TabsTrigger>
            <TabsTrigger value="converts" data-testid="tab-converts">Converts ({converts.length})</TabsTrigger>
            <TabsTrigger value="new-members" data-testid="tab-new-members">New Members ({newMembers.length})</TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">Members ({members.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions and events in this ministry</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
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
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaders">
            <Card>
              <CardHeader>
                <CardTitle>Ministry Leaders</CardTitle>
                <CardDescription>Team members serving in this ministry</CardDescription>
              </CardHeader>
              <CardContent>
                {leaders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaders.map((leader) => (
                        <TableRow key={leader.id} data-testid={`row-leader-${leader.id}`}>
                          <TableCell className="font-medium">
                            {leader.firstName} {leader.lastName}
                          </TableCell>
                          <TableCell>{leader.email}</TableCell>
                          <TableCell>
                            <Badge variant={leader.role === "MINISTRY_ADMIN" ? "default" : "secondary"}>
                              {leader.role === "MINISTRY_ADMIN" ? "Ministry Admin" : "Leader"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(leader.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No leaders assigned yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="converts">
            <Card>
              <CardHeader>
                <CardTitle>Converts</CardTitle>
                <CardDescription>New believers registered at this ministry</CardDescription>
              </CardHeader>
              <CardContent>
                {converts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {converts.slice(0, 10).map((convert) => (
                        <TableRow key={convert.id} data-testid={`row-convert-${convert.id}`}>
                          <TableCell className="font-medium">
                            {convert.firstName} {convert.lastName}
                          </TableCell>
                          <TableCell>{convert.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={convert.status === "NEW" ? "default" : "secondary"}>
                              {convert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(convert.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No converts registered yet</p>
                )}
                {converts.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing 10 of {converts.length} converts
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="new-members">
            <Card>
              <CardHeader>
                <CardTitle>New Members</CardTitle>
                <CardDescription>Recently joined members at this ministry</CardDescription>
              </CardHeader>
              <CardContent>
                {newMembers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newMembers.slice(0, 10).map((nm) => (
                        <TableRow key={nm.id} data-testid={`row-new-member-${nm.id}`}>
                          <TableCell className="font-medium">
                            {nm.firstName} {nm.lastName}
                          </TableCell>
                          <TableCell>{nm.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={nm.status === "NEW" ? "default" : "secondary"}>
                              {nm.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(nm.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No new members registered yet</p>
                )}
                {newMembers.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing 10 of {newMembers.length} new members
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>Registered members at this ministry</CardDescription>
              </CardHeader>
              <CardContent>
                {members.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Member Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.slice(0, 10).map((member) => (
                        <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                          <TableCell className="font-medium">
                            {member.firstName} {member.lastName}
                          </TableCell>
                          <TableCell>{member.phone || "-"}</TableCell>
                          <TableCell>{member.email || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.memberSince ? format(new Date(member.memberSince), "MMM yyyy") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No members registered yet</p>
                )}
                {members.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing 10 of {members.length} members
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
