import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, Mail, User, Clock } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Link } from "wouter";

interface FollowUp {
  id: string;
  convertId: string;
  convertFirstName: string;
  convertLastName: string;
  convertPhone: string | null;
  convertEmail: string | null;
  nextFollowupDate: string;
  notes: string | null;
}

function getDateBadge(dateStr: string, id: string) {
  const date = new Date(dateStr);
  const daysUntil = differenceInDays(date, new Date());
  
  if (isToday(date)) {
    return <Badge variant="destructive" data-testid={`badge-status-${id}`}>Today</Badge>;
  }
  if (isTomorrow(date)) {
    return <Badge variant="default" data-testid={`badge-status-${id}`}>Tomorrow</Badge>;
  }
  if (daysUntil <= 7) {
    return <Badge variant="secondary" data-testid={`badge-status-${id}`}>This Week</Badge>;
  }
  return <Badge variant="outline" data-testid={`badge-status-${id}`}>Upcoming</Badge>;
}

export default function LeaderFollowups() {
  const { data: followups, isLoading } = useQuery<FollowUp[]>({
    queryKey: ["/api/leader/followups"],
  });

  return (
    <DashboardLayout title="Upcoming Follow-ups">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Upcoming Follow-ups</h2>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Your scheduled follow-ups with new converts
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : followups && followups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Convert</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Follow-up Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.map((followup) => (
                    <TableRow key={followup.id} data-testid={`row-followup-${followup.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-convert-name-${followup.id}`}>
                            {followup.convertFirstName} {followup.convertLastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {followup.convertPhone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {followup.convertPhone}
                            </div>
                          )}
                          {followup.convertEmail && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {followup.convertEmail}
                            </div>
                          )}
                          {!followup.convertPhone && !followup.convertEmail && (
                            <span className="text-sm text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-followup-date-${followup.id}`}>
                            {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getDateBadge(followup.nextFollowupDate, followup.id)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {followup.notes || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/leader/converts/${followup.convertId}`}>
                          <Button variant="outline" data-testid={`button-view-convert-${followup.id}`}>
                            View Convert
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming follow-ups</h3>
                <p className="text-muted-foreground mb-4">
                  When you schedule follow-ups with your converts, they'll appear here
                </p>
                <Link href="/leader/converts">
                  <Button data-testid="button-view-converts">
                    View Your Converts
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
