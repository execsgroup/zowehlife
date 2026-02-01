import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Phone, Mail, Clock, Video, User, Eye } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";

interface FollowUp {
  id: string;
  convertId: string;
  convertFirstName: string;
  convertLastName: string;
  convertPhone: string | null;
  convertEmail: string | null;
  nextFollowupDate: string;
  notes: string | null;
  videoLink: string | null;
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

export default function MinistryAdminFollowups() {
  const { data: followups, isLoading } = useQuery<FollowUp[]>({
    queryKey: ["/api/ministry-admin/followups"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Calendar className="h-6 w-6" />
            Follow-ups
          </h1>
          <p className="text-muted-foreground">View scheduled follow-ups in your ministry</p>
        </div>

        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : followups && followups.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Convert</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followups.map((followup) => (
                      <TableRow key={followup.id} data-testid={`row-followup-${followup.id}`}>
                        <TableCell>
                          <Link href={`/ministry-admin/converts/${followup.convertId}`}>
                            <div className="flex items-center gap-2 hover:text-primary cursor-pointer transition-colors">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-convert-name-${followup.id}`}>
                                {followup.convertFirstName} {followup.convertLastName}
                              </span>
                            </div>
                          </Link>
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
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(followup.nextFollowupDate, followup.id)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {followup.notes || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/ministry-admin/converts/${followup.convertId}`}>
                                  <Button variant="outline" size="icon" data-testid={`button-view-convert-${followup.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>View Convert Details</TooltipContent>
                            </Tooltip>
                            {followup.videoLink && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={followup.videoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="default" size="icon" data-testid={`button-join-meeting-${followup.id}`}>
                                      <Video className="h-4 w-4" />
                                    </Button>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>Join Meeting</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No follow-ups scheduled</h3>
                <p className="text-muted-foreground">
                  Follow-ups will appear here when leaders schedule them
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
