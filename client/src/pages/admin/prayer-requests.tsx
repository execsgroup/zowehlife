import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type PrayerRequest } from "@shared/schema";
import { HandHeart, Mail, Phone, Church, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function AdminPrayerRequests() {
  const { data: requests, isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/admin/prayer-requests"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Prayer Requests"
          description="View and manage prayer requests submitted through the public site"
        />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Section key={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-20 w-full" />
              </Section>
            ))}
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((request) => (
              <Section key={request.id} data-testid={`card-prayer-request-${request.id}`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{request.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      New
                    </Badge>
                  </div>

                  <div className="bg-muted/50 rounded-md p-4">
                    <p className="text-sm whitespace-pre-wrap">{request.message}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {request.email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <a
                          href={`mailto:${request.email}`}
                          className="hover:text-foreground transition-colors"
                        >
                          {request.email}
                        </a>
                      </div>
                    )}
                    {request.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <a
                          href={`tel:${request.phone}`}
                          className="hover:text-foreground transition-colors"
                        >
                          {request.phone}
                        </a>
                      </div>
                    )}
                    {request.churchPreference && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Church className="h-3 w-3" />
                        {request.churchPreference}
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            ))}
          </div>
        ) : (
          <Section>
            <div className="p-12 text-center">
              <HandHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-sm font-semibold mb-2">No prayer requests yet</h3>
              <p className="text-xs text-muted-foreground">
                Prayer requests submitted through the public contact form will appear here.
              </p>
            </div>
          </Section>
        )}
      </div>
    </DashboardLayout>
  );
}
