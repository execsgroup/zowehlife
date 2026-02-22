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
import { Search, Users, Phone, Mail, Eye, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { NewMemberScheduleFollowUpDialog } from "@/components/new-member-schedule-followup-dialog";

interface NewMember {
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
  status: string;
  followUpStage: string | null;
  notes: string | null;
  selfSubmitted: boolean;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-muted",
  CONTACTED: "bg-primary/10 text-primary border-primary/20",
  ACTIVE: "bg-success/10 text-success border-success/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
  CONNECTED: "bg-success/10 text-success border-success/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
  NEEDS_FOLLOWUP: "bg-gold/10 text-gold border-gold/20",
  SCHEDULED_VISIT: "bg-primary/10 text-primary border-primary/20",
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  NOT_COMPLETED: "bg-coral/10 text-coral border-coral/20",
};

const followUpStageLabelKeys: Record<string, string> = {
  NEW: "newMembers.followUpStageNotStarted",
  CONTACT_NEW_MEMBER: "newMembers.followUpStageNeedsContact",
  SCHEDULED: "newMembers.followUpStage1stScheduled",
  FIRST_COMPLETED: "newMembers.followUpStage1stCompleted",
  INITIATE_SECOND: "newMembers.followUpStageReadyFor2nd",
  SECOND_SCHEDULED: "newMembers.followUpStage2ndScheduled",
  SECOND_COMPLETED: "newMembers.followUpStage2ndCompleted",
  INITIATE_FINAL: "newMembers.followUpStageReadyForFinal",
  FINAL_SCHEDULED: "newMembers.followUpStageFinalScheduled",
  FINAL_COMPLETED: "newMembers.followUpStageCompleted",
};

const followUpStageColors: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-muted",
  CONTACT_NEW_MEMBER: "bg-gold/10 text-gold border-gold/20",
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  FIRST_COMPLETED: "bg-success/10 text-success border-success/20",
  INITIATE_SECOND: "bg-gold/10 text-gold border-gold/20",
  SECOND_SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  SECOND_COMPLETED: "bg-success/10 text-success border-success/20",
  INITIATE_FINAL: "bg-gold/10 text-gold border-gold/20",
  FINAL_SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  FINAL_COMPLETED: "bg-success/10 text-success border-success/20",
};

export default function MinistryAdminNewMembers() {
  const { t } = useTranslation();
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState<NewMember | null>(null);

  const statusLabels: Record<string, string> = {
    CONNECTED: t('statusLabels.connected'),
    NO_RESPONSE: t('statusLabels.notConnected'),
    NEEDS_FOLLOWUP: t('statusLabels.needsFollowUp'),
    SCHEDULED_VISIT: t('statusLabels.scheduledVisit'),
  };

  const [searchQuery, setSearchQuery] = useState("");

  const { data: newMembers, isLoading } = useQuery<NewMember[]>({
    queryKey: ["/api/ministry-admin/new-members"],
  });

  const filteredMembers = newMembers?.filter((member) => {
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
              <Users className="h-6 w-6" />
              {t('newMembers.title')}
            </h1>
            <p className="text-muted-foreground">{t('newMembers.viewAllNewMembers')}</p>
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
                data-testid="input-search-new-members"
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
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('forms.visitDate')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-new-member-${member.id}`}>
                        <TableCell>
                          <Link href={`/ministry-admin/new-members/${member.id}`}>
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
                          {(member as any).lastFollowupOutcome ? (
                            <Badge className={statusColors[(member as any).lastFollowupOutcome] || "bg-muted text-muted-foreground"}>
                              {statusLabels[(member as any).lastFollowupOutcome] || (member as any).lastFollowupOutcome}
                            </Badge>
                          ) : (
                            <Badge className={followUpStageColors[member.followUpStage || "NEW"]}>
                              {t(followUpStageLabelKeys[member.followUpStage || "NEW"])}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(member.createdAt), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedNewMember(member);
                                    setFollowUpDialogOpen(true);
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
                                <Link href={`/ministry-admin/new-members/${member.id}`}>
                                  <Button
                                    size="icon"
                                    variant="default"
                                    data-testid={`button-view-member-${member.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.view')}</TooltipContent>
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
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('newMembers.noNewMembers')}</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? t('common.tryDifferentSearch') : t('newMembers.newMembersWillAppear')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Follow Up Dialog */}
      {selectedNewMember && (
        <NewMemberScheduleFollowUpDialog
          open={followUpDialogOpen}
          onOpenChange={(open) => {
            setFollowUpDialogOpen(open);
            if (!open) setSelectedNewMember(null);
          }}
          newMemberId={selectedNewMember.id}
          newMemberFirstName={selectedNewMember.firstName}
          newMemberLastName={selectedNewMember.lastName}
          newMemberPhone={selectedNewMember.phone}
        />
      )}
    </DashboardLayout>
  );
}
