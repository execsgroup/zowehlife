import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { type Convert, type Church } from "@shared/schema";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Heart,
  Globe,
  Users,
  MessageSquare,
  Church as ChurchIcon,
  Cake,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  NEW: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

interface ConvertWithChurch extends Convert {
  church?: Church;
}

export default function AdminConvertDetail() {
  const [, params] = useRoute("/admin/converts/:id");
  const convertId = params?.id;

  const { data: convert, isLoading } = useQuery<ConvertWithChurch>({
    queryKey: ["/api/admin/converts", convertId],
    enabled: !!convertId,
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Convert Details">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!convert) {
    return (
      <DashboardLayout title="Convert Not Found">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Convert not found</h3>
            <p className="text-muted-foreground mb-4">
              The convert you're looking for doesn't exist.
            </p>
            <Link href="/admin/converts">
              <Button>Back to Converts</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Convert Details">
      <div className="space-y-6">
        <Link href="/admin/converts">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Converts
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {convert.firstName} {convert.lastName}
                </CardTitle>
                <CardDescription>
                  Added on {format(new Date(convert.createdAt), "MMMM d, yyyy")}
                  {convert.church && (
                    <span> • Church: <strong>{convert.church.name}</strong></span>
                  )}
                </CardDescription>
              </div>
              <Badge className={statusColors[convert.status]}>
                {convert.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {convert.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${convert.phone}`} className="hover:underline">
                      {convert.phone}
                    </a>
                  </div>
                )}
                {convert.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${convert.email}`} className="hover:underline">
                      {convert.email}
                    </a>
                  </div>
                )}
                {convert.address && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{convert.address}</span>
                  </div>
                )}
                {convert.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{convert.country}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Personal Details</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {convert.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Date of Birth:</span>
                      {format(new Date(convert.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {convert.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Gender:</span>
                      {convert.gender}
                    </span>
                  </div>
                )}
                {convert.ageGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Age Group:</span>
                      {convert.ageGroup}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Faith Journey</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {convert.salvationDecision && (
                  <div className="flex items-start gap-2 md:col-span-2">
                    <Heart className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      <span className="text-muted-foreground mr-1">Decision:</span>
                      {convert.salvationDecision}
                    </span>
                  </div>
                )}
                {convert.isChurchMember !== null && convert.isChurchMember !== undefined && (
                  <div className="flex items-center gap-2">
                    <ChurchIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Church Member:</span>
                      {convert.isChurchMember}
                    </span>
                  </div>
                )}
                {convert.wantsContact !== null && convert.wantsContact !== undefined && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Wants Contact:</span>
                      {convert.wantsContact}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {convert.prayerRequest && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Prayer Request</h4>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {convert.prayerRequest}
                  </p>
                </div>
              </>
            )}

            {convert.summaryNotes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Notes
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {convert.summaryNotes}
                  </p>
                </div>
              </>
            )}

            {convert.selfSubmitted === "true" && (
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
