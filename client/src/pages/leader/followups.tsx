import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSortableTable } from "@/hooks/use-sortable-table";
import { SortableTableHead } from "@/components/sortable-table-head";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { AITextarea } from "@/components/ai-text-helper";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Calendar, Phone, Mail, User, Clock, Loader2, FileSpreadsheet, Users, Video } from "lucide-react";
import { FollowUpActionButtons } from "@/components/followup-action-buttons";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ConvertFollowUp {
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
  scheduledByName: string | null;
}

interface NewMemberFollowUp {
  id: string;
  newMemberId: string;
  newMemberFirstName: string;
  newMemberLastName: string;
  newMemberPhone: string | null;
  newMemberEmail: string | null;
  nextFollowupDate: string;
  nextFollowupTime: string | null;
  notes: string | null;
  videoLink: string | null;
  scheduledByName: string | null;
}

interface MemberFollowUp {
  id: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberPhone: string | null;
  memberEmail: string | null;
  nextFollowupDate: string;
  nextFollowupTime: string | null;
  notes: string | null;
  videoLink: string | null;
  scheduledByName: string | null;
}

interface MassFollowupParticipant {
  id: string;
  massFollowupId: string;
  personCategory: string;
  convertId: string | null;
  newMemberId: string | null;
  memberId: string | null;
  guestId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  attended: string;
  videoLink: string | null;
}

interface MassFollowupData {
  id: string;
  churchId: string;
  createdByUserId: string;
  category: string;
  scheduledDate: string;
  scheduledTime: string | null;
  notes: string | null;
  completionNotes: string | null;
  status: string;
  customSubject: string | null;
  customMessage: string | null;
  videoLink: string | null;
  completedAt: string | null;
  createdAt: string;
  scheduledByName: string | null;
}

const followUpNotesSchemaBase = z.object({
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP"]),
  notes: z.string().optional(),
});

type FollowUpNotesData = z.infer<typeof followUpNotesSchemaBase>;

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const scheduleFollowUpSchemaBase = z.object({
  nextFollowupDate: z.string().min(1),
  nextFollowupTime: z.string().min(1),
  customLeaderSubject: z.string().optional(),
  customLeaderMessage: z.string().optional(),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
});

type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchemaBase>;

type FollowUpType = "convert" | "newMember" | "member";

interface SelectedFollowUp {
  type: FollowUpType;
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export default function LeaderFollowups() {
  const { t } = useTranslation();

  const followUpNotesSchema = z.object({
    outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP"]),
    notes: z.string().optional(),
  });

  const scheduleFollowUpSchema = z.object({
    nextFollowupDate: z.string().min(1, t('validation.followUpDateRequired')),
    nextFollowupTime: z.string().min(1, t('validation.followUpTimeRequired')),
    customLeaderSubject: z.string().optional(),
    customLeaderMessage: z.string().optional(),
    customConvertSubject: z.string().optional(),
    customConvertMessage: z.string().optional(),
    includeVideoLink: z.boolean().optional(),
  });

  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [, navigate] = useLocation();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<SelectedFollowUp | null>(null);
  const [massNotesDialogOpen, setMassNotesDialogOpen] = useState(false);
  const [selectedMassFollowup, setSelectedMassFollowup] = useState<MassFollowupData | null>(null);
  const [massParticipants, setMassParticipants] = useState<MassFollowupParticipant[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [massNotes, setMassNotes] = useState("");

  const getDateBadge = (dateStr: string, id: string) => {
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
  };

  const { data: convertFollowups, isLoading: isLoadingConverts } = useQuery<ConvertFollowUp[]>({
    queryKey: [`${apiBasePath}/followups`],
  });

  const { data: newMemberFollowups, isLoading: isLoadingNewMembers } = useQuery<NewMemberFollowUp[]>({
    queryKey: [`${apiBasePath}/new-member-followups`],
  });

  const { data: memberFollowups, isLoading: isLoadingMembers } = useQuery<MemberFollowUp[]>({
    queryKey: [`${apiBasePath}/member-followups`],
  });

  const { data: massFollowups, isLoading: isLoadingMass } = useQuery<MassFollowupData[]>({
    queryKey: [`${apiBasePath}/mass-followups`],
  });

  const isLoading = isLoadingConverts || isLoadingNewMembers || isLoadingMembers;

  const { sortedData: sortedMassFollowups, sortConfig: sortConfigMass, requestSort: requestSortMass } = useSortableTable(massFollowups);
  const { sortedData: sortedConvertFollowups, sortConfig: sortConfigConverts, requestSort: requestSortConverts } = useSortableTable(convertFollowups);
  const { sortedData: sortedNewMemberFollowups, sortConfig: sortConfigNewMembers, requestSort: requestSortNewMembers } = useSortableTable(newMemberFollowups);
  const { sortedData: sortedMemberFollowups, sortConfig: sortConfigMembers, requestSort: requestSortMembers } = useSortableTable(memberFollowups);

  const notesForm = useForm<FollowUpNotesData>({
    resolver: zodResolver(followUpNotesSchema),
    defaultValues: {
      outcome: "CONNECTED",
      notes: "",
    },
  });

  const scheduleForm = useForm<ScheduleFollowUpData>({
    resolver: zodResolver(scheduleFollowUpSchema),
    defaultValues: {
      nextFollowupDate: "",
      nextFollowupTime: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      includeVideoLink: true,
    },
  });

  const notesMutation = useMutation({
    mutationFn: async (data: FollowUpNotesData) => {
      if (!selectedFollowUp) return;
      let endpoint: string;
      if (selectedFollowUp.type === "convert") {
        endpoint = `${apiBasePath}/checkins/${selectedFollowUp.id}/complete`;
      } else if (selectedFollowUp.type === "newMember") {
        endpoint = `${apiBasePath}/new-member-checkins/${selectedFollowUp.id}/complete`;
      } else {
        endpoint = `${apiBasePath}/member-checkins/${selectedFollowUp.id}/complete`;
      }
      await apiRequest("PATCH", endpoint, {
        outcome: data.outcome,
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      toast({
        title: t('followUps.notesRecorded'),
        description: t('followUps.notesRecordedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-member-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/member-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/stats`] });
      setNotesDialogOpen(false);
      setSelectedFollowUp(null);
      notesForm.reset({
        outcome: "CONNECTED",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      if (!selectedFollowUp) return;
      let endpoint: string;
      if (selectedFollowUp.type === "convert") {
        endpoint = `${apiBasePath}/converts/${selectedFollowUp.entityId}/schedule-followup`;
      } else if (selectedFollowUp.type === "newMember") {
        endpoint = `${apiBasePath}/new-members/${selectedFollowUp.entityId}/schedule-followup`;
      } else {
        endpoint = `${apiBasePath}/members/${selectedFollowUp.entityId}/schedule-followup`;
      }
      await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: t('followUps.followUpScheduled'),
        description: t('followUps.followUpScheduledDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-member-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/member-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      setScheduleDialogOpen(false);
      setSelectedFollowUp(null);
      scheduleForm.reset({
        nextFollowupDate: "",
        nextFollowupTime: "",
        includeVideoLink: true,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const handleAddConvertNotes = (followup: ConvertFollowUp) => {
    setSelectedFollowUp({
      type: "convert",
      id: followup.id,
      entityId: followup.convertId,
      firstName: followup.convertFirstName,
      lastName: followup.convertLastName,
      email: followup.convertEmail,
    });
    notesForm.reset({
      outcome: "CONNECTED",
      notes: "",
    });
    setNotesDialogOpen(true);
  };

  const handleAddNewMemberNotes = (followup: NewMemberFollowUp) => {
    setSelectedFollowUp({
      type: "newMember",
      id: followup.id,
      entityId: followup.newMemberId,
      firstName: followup.newMemberFirstName,
      lastName: followup.newMemberLastName,
      email: followup.newMemberEmail,
    });
    notesForm.reset({
      outcome: "CONNECTED",
      notes: "",
    });
    setNotesDialogOpen(true);
  };

  const handleAddMemberNotes = (followup: MemberFollowUp) => {
    setSelectedFollowUp({
      type: "member",
      id: followup.id,
      entityId: followup.memberId,
      firstName: followup.memberFirstName,
      lastName: followup.memberLastName,
      email: followup.memberEmail,
    });
    notesForm.reset({
      outcome: "CONNECTED",
      notes: "",
    });
    setNotesDialogOpen(true);
  };

  const handleScheduleMemberFollowUp = (followup: MemberFollowUp) => {
    setSelectedFollowUp({
      type: "member",
      id: followup.id,
      entityId: followup.memberId,
      firstName: followup.memberFirstName,
      lastName: followup.memberLastName,
      email: followup.memberEmail,
    });
    scheduleForm.reset({
      nextFollowupDate: "",
      nextFollowupTime: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      includeVideoLink: true,
    });
    setScheduleDialogOpen(true);
  };

  const handleScheduleConvertFollowUp = (followup: ConvertFollowUp) => {
    setSelectedFollowUp({
      type: "convert",
      id: followup.id,
      entityId: followup.convertId,
      firstName: followup.convertFirstName,
      lastName: followup.convertLastName,
      email: followup.convertEmail,
    });
    scheduleForm.reset({
      nextFollowupDate: "",
      nextFollowupTime: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      includeVideoLink: true,
    });
    setScheduleDialogOpen(true);
  };

  const handleScheduleNewMemberFollowUp = (followup: NewMemberFollowUp) => {
    setSelectedFollowUp({
      type: "newMember",
      id: followup.id,
      entityId: followup.newMemberId,
      firstName: followup.newMemberFirstName,
      lastName: followup.newMemberLastName,
      email: followup.newMemberEmail,
    });
    scheduleForm.reset({
      nextFollowupDate: "",
      nextFollowupTime: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      includeVideoLink: true,
    });
    setScheduleDialogOpen(true);
  };

  const handleOpenMassNotes = async (massFollowup: MassFollowupData) => {
    setSelectedMassFollowup(massFollowup);
    setMassNotes("");
    try {
      const res = await fetch(`${apiBasePath}/mass-followups/${massFollowup.id}`, { credentials: "include" });
      const data = await res.json();
      setMassParticipants(data.participants || []);
      setAttendeeIds((data.participants || []).map((p: MassFollowupParticipant) => p.id));
    } catch {
      setMassParticipants([]);
      setAttendeeIds([]);
    }
    setMassNotesDialogOpen(true);
  };

  const completeMassMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMassFollowup) return;
      await apiRequest("POST", `${apiBasePath}/mass-followups/${selectedMassFollowup.id}/complete`, {
        notes: massNotes,
        attendees: attendeeIds,
      });
    },
    onSuccess: () => {
      toast({ title: t('followUps.massCompleted'), description: t('followUps.massCompletedDesc') });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/mass-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-member-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      setMassNotesDialogOpen(false);
      setSelectedMassFollowup(null);
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message || t('common.failedToSave'), variant: "destructive" });
    },
  });

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`${apiBasePath}/followups/export-excel`);
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `followups-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('followUps.exportFailed'),
        description: t('followUps.exportFailedDesc'),
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('followUps.title')}
          description={t('followUps.description')}
          actions={
            <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4" />
              {t('forms.exportExcel')}
            </Button>
          }
        />

        {/* Group Follow-ups Section */}
        <Section title={t('followUps.massFollowUps')} noPadding>
              {isLoadingMass ? (
                <div className="p-6 space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedMassFollowups && sortedMassFollowups.filter(mf => mf.status === "SCHEDULED").length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('forms.category')} sortKey="category" sortConfig={sortConfigMass} onSort={requestSortMass} />
                      <SortableTableHead label={t('forms.scheduledDate')} sortKey="scheduledDate" sortConfig={sortConfigMass} onSort={requestSortMass} />
                      <SortableTableHead label={t('followUps.scheduledByColumn')} sortKey="scheduledByName" sortConfig={sortConfigMass} onSort={requestSortMass} />
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('forms.notes')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMassFollowups.filter(mf => mf.status === "SCHEDULED").map((mf) => (
                      <TableRow key={mf.id} data-testid={`row-mass-followup-${mf.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium capitalize" data-testid={`text-mass-category-${mf.id}`}>
                              {mf.category.replace("_", " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-mass-date-${mf.id}`}>
                              {format(new Date(mf.scheduledDate), "MMM d, yyyy")}
                              {mf.scheduledTime && <span> {t('common.at')} {formatTime(mf.scheduledTime)}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-scheduled-by-mass-${mf.id}`}>
                            {mf.scheduledByName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(mf.scheduledDate, `mass-${mf.id}`)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {mf.notes && !mf.notes.startsWith("Follow-up scheduled for") && !mf.notes.startsWith("Mass follow-up scheduled for") ? mf.notes : "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <FollowUpActionButtons
                            id={mf.id}
                            prefix="mass"
                            videoLink={mf.videoLink}
                            onNotes={() => handleOpenMassNotes(mf)}
                            onSchedule={() => navigate(`${basePath}/mass-followup`)}
                            notesLabel={t('followUps.recordAttendance')}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('followUps.noFollowUps')}</p>
                </div>
              )}
        </Section>

        {/* Convert Follow-ups Section */}
        <Section title={t('followUps.convertFollowUps')} noPadding>
              {isLoadingConverts ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedConvertFollowups && sortedConvertFollowups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('sidebar.converts')} sortKey="convertFirstName" sortConfig={sortConfigConverts} onSort={requestSortConverts} />
                      <SortableTableHead label={t('forms.contact')} sortKey="convertPhone" sortConfig={sortConfigConverts} onSort={requestSortConverts} />
                      <SortableTableHead label={t('followUps.followUpDate')} sortKey="nextFollowupDate" sortConfig={sortConfigConverts} onSort={requestSortConverts} />
                      <SortableTableHead label={t('followUps.scheduledByColumn')} sortKey="scheduledByName" sortConfig={sortConfigConverts} onSort={requestSortConverts} />
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('forms.notes')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedConvertFollowups.map((followup) => (
                      <TableRow key={followup.id} data-testid={`row-convert-followup-${followup.id}`}>
                        <TableCell>
                          <Link href={`${basePath}/converts/${followup.convertId}`}>
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
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-followup-date-${followup.id}`}>
                              {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                              {followup.nextFollowupTime && <span> {t('common.at')} {formatTime(followup.nextFollowupTime)}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-scheduled-by-${followup.id}`}>
                            {followup.scheduledByName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(followup.nextFollowupDate, followup.id)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {followup.notes && !followup.notes.startsWith("Follow-up scheduled for") && !followup.notes.startsWith("Mass follow-up scheduled for") ? followup.notes : "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <FollowUpActionButtons
                            id={followup.id}
                            prefix="convert"
                            videoLink={followup.videoLink}
                            onNotes={() => handleAddConvertNotes(followup)}
                            onSchedule={() => handleScheduleConvertFollowUp(followup)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('followUps.noFollowUps')}</p>
                </div>
              )}
        </Section>

        {/* New Member Follow-ups Section */}
        <Section title={t('followUps.newMemberFollowUps')} noPadding>
              {isLoadingNewMembers ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedNewMemberFollowups && sortedNewMemberFollowups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('newMembers.title')} sortKey="newMemberFirstName" sortConfig={sortConfigNewMembers} onSort={requestSortNewMembers} />
                      <SortableTableHead label={t('forms.contact')} sortKey="newMemberPhone" sortConfig={sortConfigNewMembers} onSort={requestSortNewMembers} />
                      <SortableTableHead label={t('followUps.followUpDate')} sortKey="nextFollowupDate" sortConfig={sortConfigNewMembers} onSort={requestSortNewMembers} />
                      <SortableTableHead label={t('followUps.scheduledByColumn')} sortKey="scheduledByName" sortConfig={sortConfigNewMembers} onSort={requestSortNewMembers} />
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('forms.notes')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedNewMemberFollowups.map((followup) => (
                      <TableRow key={followup.id} data-testid={`row-newmember-followup-${followup.id}`}>
                        <TableCell>
                          <Link href={`${basePath}/new-members/${followup.newMemberId}`}>
                            <div className="flex items-center gap-2 hover:text-primary cursor-pointer transition-colors">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-newmember-name-${followup.id}`}>
                                {followup.newMemberFirstName} {followup.newMemberLastName}
                              </span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {followup.newMemberPhone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {followup.newMemberPhone}
                              </div>
                            )}
                            {followup.newMemberEmail && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {followup.newMemberEmail}
                              </div>
                            )}
                            {!followup.newMemberPhone && !followup.newMemberEmail && (
                              <span className="text-sm text-muted-foreground">{t('forms.noContactInfo')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-newmember-date-${followup.id}`}>
                              {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                              {followup.nextFollowupTime && <span> {t('common.at')} {formatTime(followup.nextFollowupTime)}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-scheduled-by-newmember-${followup.id}`}>
                            {followup.scheduledByName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(followup.nextFollowupDate, followup.id)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {followup.notes && !followup.notes.startsWith("Follow-up scheduled for") && !followup.notes.startsWith("Mass follow-up scheduled for") ? followup.notes : "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <FollowUpActionButtons
                            id={followup.id}
                            prefix="newmember"
                            videoLink={followup.videoLink}
                            onNotes={() => handleAddNewMemberNotes(followup)}
                            onSchedule={() => handleScheduleNewMemberFollowUp(followup)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('followUps.noFollowUps')}</p>
                </div>
              )}
        </Section>

        {/* Member Follow-ups Section */}
        <Section title={t('followUps.memberFollowUps')} noPadding>
              {isLoadingMembers ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedMemberFollowups && sortedMemberFollowups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('membersPage.title')} sortKey="memberFirstName" sortConfig={sortConfigMembers} onSort={requestSortMembers} />
                      <SortableTableHead label={t('forms.contact')} sortKey="memberPhone" sortConfig={sortConfigMembers} onSort={requestSortMembers} />
                      <SortableTableHead label={t('followUps.followUpDate')} sortKey="nextFollowupDate" sortConfig={sortConfigMembers} onSort={requestSortMembers} />
                      <SortableTableHead label={t('followUps.scheduledByColumn')} sortKey="scheduledByName" sortConfig={sortConfigMembers} onSort={requestSortMembers} />
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('forms.notes')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMemberFollowups.map((followup) => (
                      <TableRow key={followup.id} data-testid={`row-member-followup-${followup.id}`}>
                        <TableCell>
                          <Link href={`${basePath}/members/${followup.memberId}`}>
                            <div className="flex items-center gap-2 hover:text-primary cursor-pointer transition-colors">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-member-name-${followup.id}`}>
                                {followup.memberFirstName} {followup.memberLastName}
                              </span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {followup.memberPhone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {followup.memberPhone}
                              </div>
                            )}
                            {followup.memberEmail && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {followup.memberEmail}
                              </div>
                            )}
                            {!followup.memberPhone && !followup.memberEmail && (
                              <span className="text-sm text-muted-foreground">{t('forms.noContactInfo')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-member-date-${followup.id}`}>
                              {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                              {followup.nextFollowupTime && <span> {t('common.at')} {formatTime(followup.nextFollowupTime)}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-scheduled-by-member-${followup.id}`}>
                            {followup.scheduledByName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(followup.nextFollowupDate, followup.id)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {followup.notes && !followup.notes.startsWith("Follow-up scheduled for") && !followup.notes.startsWith("Mass follow-up scheduled for") ? followup.notes : "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <FollowUpActionButtons
                            id={followup.id}
                            prefix="member"
                            videoLink={followup.videoLink}
                            onNotes={() => handleAddMemberNotes(followup)}
                            onSchedule={() => handleScheduleMemberFollowUp(followup)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('followUps.noFollowUps')}</p>
                </div>
              )}
        </Section>
      </div>

      {/* Follow Up Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('followUps.followUpNotes')}</DialogTitle>
            <DialogDescription>
              {selectedFollowUp && (
                <>{t('followUps.recordNoteDesc', { name: `${selectedFollowUp.firstName} ${selectedFollowUp.lastName}` })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...notesForm}>
            <form
              onSubmit={notesForm.handleSubmit((data) => notesMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={notesForm.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('followUps.outcome')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-notes-outcome">
                          <SelectValue placeholder={t('forms.selectOutcome')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONNECTED">{t('statusLabels.connected')}</SelectItem>
                        <SelectItem value="NO_RESPONSE">{t('statusLabels.notConnected')}</SelectItem>
                        {selectedFollowUp?.type !== "member" && (
                          <SelectItem value="NEEDS_FOLLOWUP">{t('statusLabels.needsFollowUp')}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={notesForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.notes')}</FormLabel>
                    <FormControl>
                      <AITextarea
                        placeholder={t('followUps.notesPlaceholder')}
                        value={field.value || ""}
                        onChange={field.onChange}
                        context="Follow-up note for a convert interaction"
                        data-testid="input-notes-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNotesDialogOpen(false)}
                >
                  {t('forms.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={notesMutation.isPending}
                  data-testid="button-save-notes"
                >
                  {notesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('forms.saving')}
                    </>
                  ) : (
                    t('forms.saveNotes')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Schedule Next Follow Up Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('followUps.scheduleNext')}</DialogTitle>
            <DialogDescription>
              {selectedFollowUp && (
                <>{t('followUps.scheduleDesc', { name: `${selectedFollowUp.firstName} ${selectedFollowUp.lastName}` })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...scheduleForm}>
            <form
              onSubmit={scheduleForm.handleSubmit((data) => scheduleMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={scheduleForm.control}
                name="nextFollowupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('followUps.followUpDate')} *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        minDate={new Date()}
                        data-testid="input-schedule-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={scheduleForm.control}
                name="nextFollowupTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('followUps.followUpTime')} *</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        data-testid="input-schedule-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={scheduleForm.control}
                name="includeVideoLink"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-include-video"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        {t('followUps.includeVideoCallLink')}
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t('followUps.videoCallDescription')}
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('followUps.customizeEmails')}
                </p>
                
                {selectedFollowUp?.email && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{t('followUps.emailTo')} {selectedFollowUp.firstName} {selectedFollowUp.lastName}</p>
                    <FormField
                      control={scheduleForm.control}
                      name="customConvertSubject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('followUps.subjectLine')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('followUps.leaveBlankSubject')}
                              {...field}
                              data-testid="input-convert-subject"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={scheduleForm.control}
                      name="customConvertMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('followUps.messageBody')}</FormLabel>
                          <FormControl>
                            <AITextarea
                              value={field.value || ""}
                              onChange={(text) => scheduleForm.setValue("customConvertMessage", text)}
                              placeholder={t('followUps.leaveBlankMessage')}
                              context={`Writing an initial follow-up email to ${selectedFollowUp?.firstName} ${selectedFollowUp?.lastName} from a church ministry.`}
                              aiPlaceholder="e.g., Write a warm welcome message..."
                              rows={4}
                              data-testid="input-convert-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">
                    {t('followUps.yourReminderEmail')}{" "}
                    <span className="italic text-muted-foreground font-normal">
                      ({t('followUps.reminderEmailDesc', { firstName: selectedFollowUp?.firstName, lastName: selectedFollowUp?.lastName })})
                    </span>
                  </p>
                  <FormField
                    control={scheduleForm.control}
                    name="customLeaderSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('followUps.subjectLine')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('followUps.leaveBlankSubject')}
                            {...field}
                            data-testid="input-leader-subject"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={scheduleForm.control}
                    name="customLeaderMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('followUps.messageBody')}</FormLabel>
                        <FormControl>
                          <AITextarea
                            value={field.value || ""}
                            onChange={(text) => scheduleForm.setValue("customLeaderMessage", text)}
                            placeholder={t('followUps.leaveBlankMessage')}
                            context={`Writing a reminder email to ${selectedFollowUp?.firstName} ${selectedFollowUp?.lastName} about an upcoming follow-up meeting from a church ministry.`}
                            aiPlaceholder="e.g., Write a friendly reminder..."
                            rows={4}
                            data-testid="input-leader-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScheduleDialogOpen(false)}
                >
                  {t('forms.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  data-testid="button-schedule-submit"
                >
                  {scheduleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('followUps.scheduling')}
                    </>
                  ) : (
                    t('followUps.scheduleFollowUp')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Group Follow-up Completion Dialog */}
      <Dialog open={massNotesDialogOpen} onOpenChange={setMassNotesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('followUps.recordMassFollowUp')}</DialogTitle>
            <DialogDescription>
              {selectedMassFollowup && (
                <>
                  {t('followUps.markAttendanceFor', { 
                    category: selectedMassFollowup.category.replace("_", " "), 
                    date: format(new Date(selectedMassFollowup.scheduledDate), "MMMM d, yyyy") + (selectedMassFollowup.scheduledTime ? ` ${t('common.at')} ${formatTime(selectedMassFollowup.scheduledTime)}` : '')
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('followUps.attendanceCount', { selected: attendeeIds.length, total: massParticipants.length })}</label>
              <div className="border rounded-md max-h-[240px] overflow-y-auto">
                {massParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 border-b last:border-b-0"
                    data-testid={`participant-row-${p.id}`}
                  >
                    <Checkbox
                      checked={attendeeIds.includes(p.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAttendeeIds((prev) => [...prev, p.id]);
                        } else {
                          setAttendeeIds((prev) => prev.filter((id) => id !== p.id));
                        }
                      }}
                      data-testid={`checkbox-participant-${p.id}`}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      {p.email && (
                        <span className="text-sm text-muted-foreground ml-2">{p.email}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttendeeIds(massParticipants.map((p) => p.id))}
                  data-testid="button-select-all-attendees"
                >
                  {t('forms.selectAll')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttendeeIds([])}
                  data-testid="button-deselect-all-attendees"
                >
                  {t('forms.deselectAll')}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="mass-notes">{t('followUps.meetingNotes')}</label>
              <AITextarea
                id="mass-notes"
                placeholder={t('followUps.massNotesPlaceholder')}
                value={massNotes}
                onChange={(text) => setMassNotes(text)}
                context={selectedMassFollowup ? `Writing meeting notes for a group follow-up session with ${selectedMassFollowup.category.replace("_", " ")} from a church ministry.` : undefined}
                aiPlaceholder="e.g., Write a summary of the meeting..."
                rows={4}
                data-testid="input-mass-notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMassNotesDialogOpen(false)}
              >
                {t('forms.cancel')}
              </Button>
              <Button
                onClick={() => completeMassMutation.mutate()}
                disabled={completeMassMutation.isPending}
                data-testid="button-complete-mass-followup"
              >
                {completeMassMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('followUps.completing')}
                  </>
                ) : (
                  t('followUps.completeFollowUp')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
