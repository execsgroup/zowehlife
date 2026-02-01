import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { type Member } from "@shared/schema";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  User,
  Globe,
  Users,
  Cake,
  Church,
} from "lucide-react";
import { format } from "date-fns";

export default function MinistryAdminMemberDetail() {
  const [, params] = useRoute("/ministry-admin/members/:id");
  const memberId = params?.id;

  const { data: member, isLoading } = useQuery<Member>({
    queryKey: ["/api/ministry-admin/members", memberId],
    enabled: !!memberId,
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Member Details">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout title="Member Not Found">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Member not found</h3>
            <p className="text-muted-foreground mb-4">
              The member you're looking for doesn't exist or you don't have access.
            </p>
            <Link href="/ministry-admin/members">
              <Button>Back to Members</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Member Details">
      <div className="space-y-6">
        <Link href="/ministry-admin/members">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {member.firstName} {member.lastName}
                </CardTitle>
                <CardDescription>
                  Added: {format(new Date(member.createdAt), "MMMM d, yyyy")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${member.phone}`} className="hover:underline">
                      {member.phone}
                    </a>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${member.email}`} className="hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
                {member.address && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{member.address}</span>
                  </div>
                )}
                {member.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{member.country}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Personal Details</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {member.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Date of Birth:</span>
                      {format(new Date(member.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {member.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Gender:</span>
                      {member.gender}
                    </span>
                  </div>
                )}
                {member.ageGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Age Group:</span>
                      {member.ageGroup}
                    </span>
                  </div>
                )}
                {member.memberSince && (
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Member Since:</span>
                      {format(new Date(member.memberSince), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {member.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Notes</h4>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {member.notes}
                  </p>
                </div>
              </>
            )}

            {member.selfSubmitted === "true" && (
              <>
                <Separator />
                <Badge variant="secondary" className="w-fit">
                  Self-submitted via public form
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
