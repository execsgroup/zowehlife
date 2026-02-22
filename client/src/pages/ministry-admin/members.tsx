import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Church, Phone, Mail, Eye, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { MemberScheduleFollowUpDialog } from "@/components/member-schedule-followup-dialog";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  dateOfBirth: string | null;
  country: string | null;
  gender: string | null;
  ageGroup: string | null;
  memberSince: string | null;
  status: string;
  lastFollowupOutcome?: string | null;
  notes: string | null;
  selfSubmitted: boolean;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  CONNECTED: "bg-coral/10 text-coral border-coral/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
};

export default function MinistryAdminMembers() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [scheduleFollowupDialogOpen, setScheduleFollowupDialogOpen] = useState(false);
  const [selectedMemberForSchedule, setSelectedMemberForSchedule] = useState<Member | null>(null);

  const statusLabels: Record<string, string> = {
    CONNECTED: t('statusLabels.connected'),
    NO_RESPONSE: t('statusLabels.notConnected'),
  };

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/ministry-admin/members"],
  });

  const filteredMembers = members?.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(query) ||
      member.lastName.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.phone?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Church className="h-6 w-6" />
              {t('membersPage.title')}
            </h1>
            <p className="text-muted-foreground">{t('membersPage.viewAllMembers')}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('forms.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-members"
              />
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.contact')}</TableHead>
                      <TableHead>{t('forms.gender')} / {t('forms.ageGroup')}</TableHead>
                      <TableHead>{t('forms.memberSince')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell>
                          <Link href={`/ministry-admin/members/${member.id}`}>
                            <div 
                              className="font-medium cursor-pointer hover:text-primary hover:underline"
                              data-testid={`link-view-details-${member.id}`}
                            >
                              {member.firstName} {member.lastName}
                            </div>
                          </Link>
                          {member.country && (
                            <div className="text-sm text-muted-foreground">{member.country}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {member.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </div>
                            )}
                            {member.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {member.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {member.gender || "—"} / {member.ageGroup || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {member.memberSince 
                              ? format(new Date(member.memberSince), "MMM d, yyyy")
                              : "—"
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.lastFollowupOutcome ? (
                            <Badge className={statusColors[member.lastFollowupOutcome] || "bg-muted text-muted-foreground"}>
                              {statusLabels[member.lastFollowupOutcome] || member.lastFollowupOutcome}
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground">
                              {t('forms.noStatus')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedMemberForSchedule(member);
                                    setScheduleFollowupDialogOpen(true);
                                  }}
                                  data-testid={`button-schedule-followup-${member.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('followUps.scheduleFollowUp')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/ministry-admin/members/${member.id}`}>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    data-testid={`button-view-member-${member.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.view')} {t('common.details')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Church className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('membersPage.noMembers')}</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? t('common.tryDifferentSearch') : t('membersPage.membersWillAppear')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedMemberForSchedule && (
        <MemberScheduleFollowUpDialog
          open={scheduleFollowupDialogOpen}
          onOpenChange={setScheduleFollowupDialogOpen}
          memberId={selectedMemberForSchedule.id}
          memberFirstName={selectedMemberForSchedule.firstName}
          memberLastName={selectedMemberForSchedule.lastName}
          memberPhone={selectedMemberForSchedule.phone}
        />
      )}
    </DashboardLayout>
  );
}
