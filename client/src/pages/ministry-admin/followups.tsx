import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Phone, Mail, Clock, Video, User } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";

interface FollowUp {
  id: string;
  convertId: string;
  convertFirstName: string;
  convertLastName: string;
  convertPhone: string | null;
  convertEmail: string | null;
  nextFollowupDate: string;
  nextFollowupTime: string | null;
  notes: string | null;
  videoLink: string | null;
}

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

function getDateBadge(dateStr: string, id: string, t: (key: string) => string) {
  const date = new Date(dateStr);
  const daysUntil = differenceInDays(date, new Date());
  
  if (isToday(date)) {
    return <Badge variant="destructive" data-testid={`badge-status-${id}`}>{t('statusLabels.today')}</Badge>;
  }
  if (isTomorrow(date)) {
    return <Badge variant="default" data-testid={`badge-status-${id}`}>{t('statusLabels.tomorrow')}</Badge>;
  }
  if (daysUntil <= 7) {
    return <Badge variant="secondary" data-testid={`badge-status-${id}`}>{t('statusLabels.thisWeek')}</Badge>;
  }
  return <Badge variant="outline" data-testid={`badge-status-${id}`}>{t('statusLabels.upcoming')}</Badge>;
}

export default function MinistryAdminFollowups() {
  const { t } = useTranslation();
  const { data: followups, isLoading } = useQuery<FollowUp[]>({
    queryKey: ["/api/ministry-admin/followups"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Calendar className="h-6 w-6" />
            {t('followUps.title')}
          </h1>
          <p className="text-muted-foreground">{t('followUps.viewScheduledFollowUps')}</p>
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
                      <TableHead>{t('converts.title')}</TableHead>
                      <TableHead>{t('forms.contact')}</TableHead>
                      <TableHead>{t('forms.scheduledDate')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('forms.notes')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
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
                              <span className="text-sm text-muted-foreground">{t('forms.noContactInfo')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                            {followup.nextFollowupTime && <span> {t('common.at')} {formatTime(followup.nextFollowupTime)}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(followup.nextFollowupDate, followup.id, t)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {followup.notes && !followup.notes.startsWith("Follow-up scheduled for") && !followup.notes.startsWith("Mass follow-up scheduled for") ? followup.notes : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
                                <TooltipContent>{t('followUps.joinMeeting')}</TooltipContent>
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
                <h3 className="text-lg font-semibold mb-2">{t('followUps.noFollowUps')}</h3>
                <p className="text-muted-foreground">
                  {t('followUps.followUpsWillAppear')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
