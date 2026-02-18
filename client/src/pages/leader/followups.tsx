import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Calendar, Phone, Mail, User, Clock, FileText, Loader2, FileSpreadsheet, CalendarPlus, Video, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Link } from "wouter";
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
}

const followUpNotesSchema = z.object({
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
  notes: z.string().optional(),
});

type FollowUpNotesData = z.infer<typeof followUpNotesSchema>;

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const scheduleFollowUpSchema = z.object({
  nextFollowupDate: z.string().min(1, "Follow-up date is required"),
  nextFollowupTime: z.string().optional(),
  customLeaderSubject: z.string().optional(),
  customLeaderMessage: z.string().optional(),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
});

type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchema>;

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

type FollowUpType = "convert" | "newMember";

interface SelectedFollowUp {
  type: FollowUpType;
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export default function LeaderFollowups() {
  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<SelectedFollowUp | null>(null);
  const [massNotesDialogOpen, setMassNotesDialogOpen] = useState(false);
  const [selectedMassFollowup, setSelectedMassFollowup] = useState<MassFollowupData | null>(null);
  const [massParticipants, setMassParticipants] = useState<MassFollowupParticipant[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [massNotes, setMassNotes] = useState("");

  const { data: convertFollowups, isLoading: isLoadingConverts } = useQuery<ConvertFollowUp[]>({
    queryKey: ["/api/leader/followups"],
  });

  const { data: newMemberFollowups, isLoading: isLoadingNewMembers } = useQuery<NewMemberFollowUp[]>({
    queryKey: ["/api/leader/new-member-followups"],
  });

  const { data: massFollowups, isLoading: isLoadingMass } = useQuery<MassFollowupData[]>({
    queryKey: [`${apiBasePath}/mass-followups`],
  });

  const isLoading = isLoadingConverts || isLoadingNewMembers;

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
      const endpoint = selectedFollowUp.type === "convert"
        ? `/api/leader/converts/${selectedFollowUp.entityId}/checkins`
        : `/api/leader/new-members/${selectedFollowUp.entityId}/checkins`;
      await apiRequest("POST", endpoint, {
        checkinDate: format(new Date(), "yyyy-MM-dd"),
        outcome: data.outcome,
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes recorded",
        description: "Your follow-up notes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-member-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/stats"] });
      setNotesDialogOpen(false);
      setSelectedFollowUp(null);
      notesForm.reset({
        outcome: "CONNECTED",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      if (!selectedFollowUp) return;
      const endpoint = selectedFollowUp.type === "convert"
        ? `/api/leader/converts/${selectedFollowUp.entityId}/schedule-followup`
        : `/api/leader/new-members/${selectedFollowUp.entityId}/schedule-followup`;
      await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Follow-up scheduled",
        description: "The next follow-up has been scheduled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-member-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
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
        title: "Error",
        description: error.message || "Failed to schedule follow-up",
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
      toast({ title: "Mass follow-up completed", description: "Attendance recorded and follow-ups logged for attendees." });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/mass-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-member-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      setMassNotesDialogOpen(false);
      setSelectedMassFollowup(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to complete", variant: "destructive" });
    },
  });

  const handleExportExcel = async () => {
    try {
      const response = await fetch("/api/leader/followups/export-excel");
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
        title: "Export failed",
        description: "Unable to export follow-ups. Please try again.",
      });
    }
  };

  return (
    <DashboardLayout title="Follow-ups">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Follow-ups</h2>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Your scheduled follow-ups with converts and new members
            </p>
          </div>
          <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Mass Follow-ups Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold" data-testid="text-mass-followup-section-title">Mass Follow-ups</h3>
          <Card>
            <CardContent className="p-0">
              {isLoadingMass ? (
                <div className="p-6 space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : massFollowups && massFollowups.filter(mf => mf.status === "SCHEDULED").length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {massFollowups.filter(mf => mf.status === "SCHEDULED").map((mf) => (
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
                              {mf.scheduledTime && <span> at {formatTime(mf.scheduledTime)}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getDateBadge(mf.scheduledDate, `mass-${mf.id}`)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {mf.notes || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleOpenMassNotes(mf)}
                                data-testid={`button-mass-notes-${mf.id}`}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Record Attendance & Notes</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No upcoming mass follow-ups</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Convert Follow-ups Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold" data-testid="text-convert-section-title">Convert Follow-ups</h3>
          <Card>
            <CardContent className="p-0">
              {isLoadingConverts ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : convertFollowups && convertFollowups.length > 0 ? (
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
                    {convertFollowups.map((followup) => (
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
                              <span className="text-sm text-muted-foreground">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-followup-date-${followup.id}`}>
                              {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                              {followup.nextFollowupTime && <span> at {formatTime(followup.nextFollowupTime)}</span>}
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
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleAddConvertNotes(followup)}
                                  data-testid={`button-convert-notes-${followup.id}`}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Follow Up Note</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleScheduleConvertFollowUp(followup)}
                                  data-testid={`button-convert-schedule-${followup.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Schedule Next Follow Up</TooltipContent>
                            </Tooltip>
                            {followup.videoLink && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={followup.videoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="default" size="icon" data-testid={`button-convert-meeting-${followup.id}`}>
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
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No upcoming convert follow-ups</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Member Follow-ups Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold" data-testid="text-new-member-section-title">New Member & Guest Follow-ups</h3>
          <Card>
            <CardContent className="p-0">
              {isLoadingNewMembers ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : newMemberFollowups && newMemberFollowups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>New Member & Guest</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Follow-up Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newMemberFollowups.map((followup) => (
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
                              <span className="text-sm text-muted-foreground">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-newmember-date-${followup.id}`}>
                              {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                              {followup.nextFollowupTime && <span> at {formatTime(followup.nextFollowupTime)}</span>}
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
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleAddNewMemberNotes(followup)}
                                  data-testid={`button-newmember-notes-${followup.id}`}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Follow Up Note</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleScheduleNewMemberFollowUp(followup)}
                                  data-testid={`button-newmember-schedule-${followup.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Schedule Next Follow Up</TooltipContent>
                            </Tooltip>
                            {followup.videoLink && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={followup.videoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="default" size="icon" data-testid={`button-newmember-meeting-${followup.id}`}>
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
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No upcoming new member follow-ups</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow Up Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow Up Notes</DialogTitle>
            <DialogDescription>
              {selectedFollowUp && (
                <>Record what happened during your follow-up with {selectedFollowUp.firstName} {selectedFollowUp.lastName}</>
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
                    <FormLabel>Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-notes-outcome">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONNECTED">Connected</SelectItem>
                        <SelectItem value="NO_RESPONSE">No Response</SelectItem>
                        <SelectItem value="NEEDS_PRAYER">Needs Prayer</SelectItem>
                        <SelectItem value="SCHEDULED_VISIT">Scheduled Visit</SelectItem>
                        <SelectItem value="REFERRED">Referred</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <AITextarea
                        placeholder="What happened during this follow-up? Any prayer requests or next steps?"
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={notesMutation.isPending}
                  data-testid="button-save-notes"
                >
                  {notesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Notes"
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
            <DialogTitle>Schedule Next Follow Up</DialogTitle>
            <DialogDescription>
              {selectedFollowUp && (
                <>Schedule a follow-up with {selectedFollowUp.firstName} {selectedFollowUp.lastName} and send email notifications</>
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
                    <FormLabel>Follow-up Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
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
                    <FormLabel>Follow-up Time (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
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
                        Include video call link
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Add a free Jitsi Meet video call link to the email
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Customize the email notifications (leave blank for defaults):
                </p>
                
                {selectedFollowUp?.email && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Email to {selectedFollowUp.firstName} {selectedFollowUp.lastName}</p>
                    <FormField
                      control={scheduleForm.control}
                      name="customConvertSubject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Leave blank for default subject..."
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
                          <FormLabel>Message Body</FormLabel>
                          <FormControl>
                            <AITextarea
                              value={field.value || ""}
                              onChange={(text) => scheduleForm.setValue("customConvertMessage", text)}
                              placeholder="Leave blank for default message..."
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
                    Your Reminder Email{" "}
                    <span className="italic text-muted-foreground font-normal">
                      (Email will be sent to {selectedFollowUp?.firstName} {selectedFollowUp?.lastName} a day before the scheduled follow up)
                    </span>
                  </p>
                  <FormField
                    control={scheduleForm.control}
                    name="customLeaderSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Leave blank for default subject..."
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
                        <FormLabel>Message Body</FormLabel>
                        <FormControl>
                          <AITextarea
                            value={field.value || ""}
                            onChange={(text) => scheduleForm.setValue("customLeaderMessage", text)}
                            placeholder="Leave blank for default message..."
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  data-testid="button-schedule-submit"
                >
                  {scheduleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Follow Up"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mass Follow-up Completion Dialog */}
      <Dialog open={massNotesDialogOpen} onOpenChange={setMassNotesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Mass Follow-up</DialogTitle>
            <DialogDescription>
              {selectedMassFollowup && (
                <>
                  Mark attendance for the {selectedMassFollowup.category.replace("_", " ")} follow-up scheduled on{" "}
                  {format(new Date(selectedMassFollowup.scheduledDate), "MMMM d, yyyy")}
                  {selectedMassFollowup.scheduledTime && ` at ${formatTime(selectedMassFollowup.scheduledTime)}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Attendance ({attendeeIds.length} of {massParticipants.length} selected)</label>
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
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttendeeIds([])}
                  data-testid="button-deselect-all-attendees"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="mass-notes">Meeting Notes</label>
              <AITextarea
                id="mass-notes"
                placeholder="What happened during this mass follow-up? Any key takeaways?"
                value={massNotes}
                onChange={(text) => setMassNotes(text)}
                context={selectedMassFollowup ? `Writing meeting notes for a mass follow-up session with ${selectedMassFollowup.category.replace("_", " ")} from a church ministry.` : undefined}
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
                Cancel
              </Button>
              <Button
                onClick={() => completeMassMutation.mutate()}
                disabled={completeMassMutation.isPending}
                data-testid="button-complete-mass-followup"
              >
                {completeMassMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Completing...
                  </>
                ) : (
                  "Complete Follow-up"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
