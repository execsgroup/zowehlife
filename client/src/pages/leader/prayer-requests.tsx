import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type PrayerRequest } from "@shared/schema";
import { HandHeart, Mail, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function LeaderPrayerRequests() {
  const { data: requests, isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/leader/prayer-requests"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Prayer Requests"
          description="View prayer requests submitted for your ministry"
        />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-md border bg-card p-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded-md border bg-card p-4 space-y-3" data-testid={`card-prayer-request-${request.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    New
                  </Badge>
                </div>

                <div className="bg-muted/50 rounded-md p-3">
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Section>
            <div className="p-12 text-center">
              <HandHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No prayer requests yet</h3>
              <p className="text-muted-foreground">
                Prayer requests submitted for your ministry will appear here.
              </p>
            </div>
          </Section>
        )}
      </div>
    </DashboardLayout>
  );
}
