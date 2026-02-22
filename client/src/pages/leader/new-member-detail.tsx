import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AITextarea } from "@/components/ai-text-helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type NewMember } from "@shared/schema";
import { NewMemberScheduleFollowUpDialog } from "@/components/new-member-schedule-followup-dialog";
import { NewMemberAddNoteDialog } from "@/components/new-member-add-note-dialog";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Loader2,
  Edit,
  User,
  Globe,
  Users,
  Video,
  Cake,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";

interface NewMemberCheckin {
  id: string;
  checkinDate: string;
  notes: string | null;
  outcome: string;
  nextFollowupDate: string | null;
  nextFollowupTime: string | null;
  videoLink: string | null;
  createdAt: string;
}

interface NewMemberWithCheckins extends NewMember {
  checkins: NewMemberCheckin[];
}

const updateNewMemberSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female", ""]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]),
});


const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "United States", "United Kingdom", "Canada", "Nigeria", "Ghana", "Kenya", "South Africa", "Zimbabwe"
];

type UpdateNewMemberData = z.infer<typeof updateNewMemberSchemaBase>;

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  CONNECTED: "bg-coral/10 text-coral border-coral/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  NEEDS_FOLLOWUP: "bg-primary/10 text-primary border-primary/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

export default function NewMemberDetail() {
  const { t } = useTranslation();

  const updateNewMemberSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    gender: z.enum(["Male", "Female", ""]).optional(),
    ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]),
  });


  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [location] = useLocation();
  const newMemberId = location.split('/').pop();

  const getOutcomeLabel = (key: string) => {
    const labels: Record<string, string> = {
      CONNECTED: t('statusLabels.connected'),
      NO_RESPONSE: t('statusLabels.noResponse'),
      NEEDS_PRAYER: t('statusLabels.needsPrayer'),
      NEEDS_FOLLOWUP: t('statusLabels.needsFollowUp'),
      SCHEDULED_VISIT: t('statusLabels.scheduledVisit'),
      REFERRED: t('statusLabels.referred'),
      OTHER: t('statusLabels.other'),
    };
    return labels[key] || key;
  };

  const getStatusLabel = (key: string) => {
    const labels: Record<string, string> = {
      NEW: t('statusLabels.new'),
      SCHEDULED: t('statusLabels.scheduled'),
      CONNECTED: t('statusLabels.connected'),
      NO_RESPONSE: t('statusLabels.noResponse'),
      NEEDS_PRAYER: t('statusLabels.needsPrayer'),
      REFERRED: t('statusLabels.referred'),
      NOT_COMPLETED: t('statusLabels.notCompleted'),
      NEVER_CONTACTED: t('statusLabels.neverContacted'),
      ACTIVE: t('statusLabels.active'),
      IN_PROGRESS: t('statusLabels.inProgress'),
      INACTIVE: t('statusLabels.inactive'),
    };
    return labels[key] || key;
  };

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(null);
  const [editingCheckin, setEditingCheckin] = useState<{ outcome: string; notes: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const { data: newMember, isLoading } = useQuery<NewMemberWithCheckins>({
    queryKey: ["/api/leader/new-members", newMemberId],
    enabled: !!newMemberId,
  });

  const editForm = useForm<UpdateNewMemberData>({
    resolver: zodResolver(updateNewMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: "",
      gender: "",
      ageGroup: "",
      address: "",
      notes: "",
      status: "NEW",
    },
  });

  const openEditDialog = () => {
    if (newMember) {
      editForm.reset({
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        phone: newMember.phone || "",
        email: newMember.email || "",
        dateOfBirth: newMember.dateOfBirth || "",
        country: newMember.country || "",
        gender: (newMember.gender || "") as "" | "Male" | "Female",
        ageGroup: (newMember.ageGroup || "") as "" | "Under 18" | "18-24" | "25-34" | "35 and Above",
        address: newMember.address || "",
        notes: newMember.notes || "",
        status: newMember.status as any,
      });
    }
    setEditDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateNewMemberData) => {
      await apiRequest("PATCH", `/api/leader/new-members/${newMemberId}`, data);
    },
    onSuccess: () => {
      toast({
        title: t('newMembers.newMemberUpdated'),
        description: t('newMembers.newMemberUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members", newMemberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!newMember) {
    return (
      <DashboardLayout>
        <Section>
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold mb-2">{t('newMembers.notFound')}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('newMembers.notFoundDesc')}
            </p>
            <Link href={`${basePath}/new-members`}>
              <Button>{t('newMembers.backToNewMembers')}</Button>
            </Link>
          </div>
        </Section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href={`${basePath}/new-members`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            {t('newMembers.backToNewMembers')}
          </Button>
        </Link>

        <PageHeader
          title={`${newMember.firstName} ${newMember.lastName}`}
          description={`${t('newMembers.joined')}: ${format(new Date(newMember.createdAt), "MMMM d, yyyy")}`}
          actions={
            <div className="flex items-center gap-2">
              <Badge className={statusColors[newMember.status]}>
                {getStatusLabel(newMember.status)}
              </Badge>
              <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1">
                <Edit className="h-3 w-3" />
                {t('forms.edit')}
              </Button>
            </div>
          }
        />

        <Section title={t('converts.contactInfo')}>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            {newMember.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${newMember.phone}`} className="hover:underline">
                  {newMember.phone}
                </a>
              </div>
            )}
            {newMember.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${newMember.email}`} className="hover:underline">
                  {newMember.email}
                </a>
              </div>
            )}
            {newMember.address && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{newMember.address}</span>
              </div>
            )}
            {newMember.country && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{newMember.country}</span>
              </div>
            )}
          </div>
        </Section>

        <Section title={t('converts.personalDetails')}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {newMember.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.dateOfBirth')}:</span>
                  {format(new Date(newMember.dateOfBirth), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {newMember.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.gender')}:</span>
                  {newMember.gender}
                </span>
              </div>
            )}
            {newMember.ageGroup && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.ageGroup')}:</span>
                  {newMember.ageGroup}
                </span>
              </div>
            )}
          </div>
          {newMember.selfSubmitted === "true" && (
            <div className="mt-3">
              <Badge variant="secondary" className="w-fit">
                {t('converts.selfSubmittedBadge')}
              </Badge>
            </div>
          )}
        </Section>

        {newMember.notes && (
          <Section title={t('forms.notes')}>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
              {newMember.notes}
            </p>
          </Section>
        )}

        <Section
          title={t('converts.followUpTimeline')}
          description={t('newMembers.recordAndTrackNewMembers')}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setScheduleDialogOpen(true)}
              data-testid="button-schedule-followup"
            >
              <Calendar className="h-4 w-4" />
              {t('converts.scheduleFollowUp')}
            </Button>
          }
        >
            {newMember.checkins && newMember.checkins.length > 0 ? (
              <div className="space-y-4">
                {newMember.checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className={`relative pl-6 pb-4 border-l-2 border-muted last:pb-0 ${checkin.outcome !== "SCHEDULED_VISIT" ? "opacity-60" : ""}`}
                    data-testid={`checkin-${checkin.id}`}
                  >
                    <div className={`absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2 border-background ${checkin.outcome !== "SCHEDULED_VISIT" ? "bg-muted-foreground" : "bg-primary"}`} />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {!(checkin.outcome === "SCHEDULED_VISIT" && checkin.nextFollowupDate) && (
                            <span className="font-medium">
                              {format(new Date(checkin.checkinDate + "T00:00:00"), "MMMM d, yyyy")}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {getOutcomeLabel(checkin.outcome)}
                          </Badge>
                        </div>
                        {checkin.notes && !checkin.notes.startsWith("Follow-up scheduled for") && !checkin.notes.startsWith("Mass follow-up scheduled for") && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {checkin.notes}
                          </p>
                        )}
                        {checkin.nextFollowupDate && (
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {t('converts.nextFollowUp')}:{" "}
                              {format(new Date(checkin.nextFollowupDate + "T00:00:00"), "MMM d, yyyy")}
                              {checkin.nextFollowupTime && (() => { const [h, m] = checkin.nextFollowupTime!.split(':').map(Number); return ` ${t('common.at')} ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {checkin.outcome === "SCHEDULED_VISIT" && (
                            <>
                              {checkin.videoLink && (
                                <a
                                  href={checkin.videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-2"
                                    data-testid={`button-join-meeting-${checkin.id}`}
                                  >
                                    <Video className="h-4 w-4" />
                                    {t('converts.joinMeeting')}
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                  setSelectedCheckinId(checkin.id);
                                  setNoteDialogOpen(true);
                                }}
                                data-testid={`button-add-note-${checkin.id}`}
                              >
                                <Plus className="h-4 w-4" />
                                {t('converts.addNote')}
                              </Button>
                            </>
                          )}
                          {checkin.outcome !== "SCHEDULED_VISIT" && checkin.outcome !== "NOT_COMPLETED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setSelectedCheckinId(checkin.id);
                                setEditingCheckin({ outcome: checkin.outcome, notes: checkin.notes || "" });
                                setNoteDialogOpen(true);
                              }}
                              data-testid={`button-edit-note-${checkin.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                              {t('followUps.editNote')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t('converts.noFollowUpNotes')}</p>
              </div>
            )}
        </Section>

        <NewMemberScheduleFollowUpDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          newMemberId={newMemberId || ""}
          newMemberFirstName={newMember.firstName}
          newMemberLastName={newMember.lastName}
          newMemberPhone={newMember.phone}
        />

        <NewMemberAddNoteDialog
          open={noteDialogOpen}
          onOpenChange={(open) => {
            setNoteDialogOpen(open);
            if (!open) {
              setSelectedCheckinId(null);
              setEditingCheckin(null);
            }
          }}
          newMember={newMember ? { id: newMember.id, firstName: newMember.firstName, lastName: newMember.lastName } : null}
          checkinId={selectedCheckinId}
          initialValues={editingCheckin}
        />

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('newMembers.editNewMember')}</DialogTitle>
              <DialogDescription>
                {t('newMembers.updateNewMemberInfo')}
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.firstName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.lastName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.phone')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.email')}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEW">{t('statusLabels.new')}</SelectItem>
                          <SelectItem value="SCHEDULED">{t('statusLabels.scheduled')}</SelectItem>
                          <SelectItem value="CONNECTED">{t('statusLabels.connected')}</SelectItem>
                          <SelectItem value="NO_RESPONSE">{t('statusLabels.noResponse')}</SelectItem>
                          <SelectItem value="NEEDS_PRAYER">{t('statusLabels.needsPrayer')}</SelectItem>
                          <SelectItem value="ACTIVE">{t('statusLabels.active')}</SelectItem>
                          <SelectItem value="IN_PROGRESS">{t('statusLabels.inProgress')}</SelectItem>
                          <SelectItem value="INACTIVE">{t('statusLabels.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.notes')}</FormLabel>
                      <FormControl>
                        <AITextarea
                          value={field.value || ""}
                          onChange={field.onChange}
                          context="Notes about a new member in a ministry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('forms.updating')}
                    </>
                  ) : (
                    t('newMembers.updateNewMember')
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
