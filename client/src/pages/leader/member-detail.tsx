import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, Link, useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AITextarea } from "@/components/ai-text-helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DatePicker } from "@/components/date-picker";
import { type Member } from "@shared/schema";
import { MemberScheduleFollowUpDialog } from "@/components/member-schedule-followup-dialog";
import { MemberAddNoteDialog } from "@/components/member-add-note-dialog";
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
  Cake,
  Church,
  Video,
} from "lucide-react";
import { format } from "date-fns";

interface MemberCheckin {
  id: string;
  checkinDate: string;
  notes: string | null;
  outcome: string;
  nextFollowupDate: string | null;
  nextFollowupTime: string | null;
  videoLink: string | null;
  createdAt: string;
  scheduledByName: string | null;
}

const updateMemberSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female", ""]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
  address: z.string().optional(),
  memberSince: z.string().optional(),
  notes: z.string().optional(),
});

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "United States", "United Kingdom", "Canada", "Nigeria", "Ghana", "Kenya", "South Africa", "Zimbabwe"
];

type UpdateMemberData = z.infer<typeof updateMemberSchemaBase>;

export default function MemberDetail() {
  const { t } = useTranslation();

  const updateMemberSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    gender: z.enum(["Male", "Female", ""]).optional(),
    ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
    address: z.string().optional(),
    memberSince: z.string().optional(),
    notes: z.string().optional(),
  });

  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [location] = useLocation();
  const memberId = location.split('/').pop();

  const getOutcomeLabel = (key: string) => {
    const labels: Record<string, string> = {
      CONNECTED: t('statusLabels.connected'),
      NO_RESPONSE: t('statusLabels.noResponse'),
      NEEDS_PRAYER: t('statusLabels.needsPrayer'),
      NEEDS_FOLLOWUP: t('statusLabels.needsFollowUp'),
      SCHEDULED_VISIT: t('statusLabels.scheduledVisit'),
      REFERRED: t('statusLabels.referred'),
      NOT_COMPLETED: t('statusLabels.notCompleted'),
      OTHER: t('statusLabels.other'),
    };
    return labels[key] || key;
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(null);
  const [editingCheckin, setEditingCheckin] = useState<{ outcome: string; notes: string } | null>(null);

  const { data: member, isLoading } = useQuery<Member>({
    queryKey: [`${apiBasePath}/members`, memberId],
    enabled: !!memberId,
  });

  const { data: checkins } = useQuery<MemberCheckin[]>({
    queryKey: [`${apiBasePath}/members/${memberId}/checkins`],
    enabled: !!memberId,
  });

  const editForm = useForm<UpdateMemberData>({
    resolver: zodResolver(updateMemberSchema),
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
      memberSince: "",
      notes: "",
    },
  });

  const openEditDialog = () => {
    if (member) {
      editForm.reset({
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone || "",
        email: member.email || "",
        dateOfBirth: member.dateOfBirth || "",
        country: member.country || "",
        gender: (member.gender || "") as "" | "Male" | "Female",
        ageGroup: (member.ageGroup || "") as "" | "Under 18" | "18-24" | "25-34" | "35 and Above",
        address: member.address || "",
        memberSince: member.memberSince || "",
        notes: member.notes || "",
      });
    }
    setEditDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateMemberData) => {
      await apiRequest("PATCH", `${apiBasePath}/members/${memberId}`, data);
    },
    onSuccess: () => {
      toast({
        title: t('membersPage.memberUpdated'),
        description: t('membersPage.memberUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`, memberId] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
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
        </div>
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout>
        <Section>
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold mb-2">{t('membersPage.memberNotFound')}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('membersPage.memberNotFoundDesc')}
            </p>
            <Link href={`${basePath}/members`}>
              <Button>{t('membersPage.backToMembers')}</Button>
            </Link>
          </div>
        </Section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href={`${basePath}/members`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            {t('membersPage.backToMembers')}
          </Button>
        </Link>

        <PageHeader
          title={`${member.firstName} ${member.lastName}`}
          description={`${t('membersPage.added')}: ${format(new Date(member.createdAt), "MMMM d, yyyy")}`}
          actions={
            <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1">
              <Edit className="h-3 w-3" />
              {t('forms.edit')}
            </Button>
          }
        />

        <Section title={t('converts.contactInfo')}>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            {member.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${member.phone}`} className="hover:underline">
                  {member.phone}
                </a>
              </div>
            )}
            {member.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.email}`} className="hover:underline">
                  {member.email}
                </a>
              </div>
            )}
            {member.address && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{member.address}</span>
              </div>
            )}
            {member.country && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{member.country}</span>
              </div>
            )}
          </div>
        </Section>

        <Section title={t('converts.personalDetails')}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {member.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.dateOfBirth')}:</span>
                  {format(new Date(member.dateOfBirth), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {member.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.gender')}:</span>
                  {member.gender}
                </span>
              </div>
            )}
            {member.ageGroup && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.ageGroup')}:</span>
                  {member.ageGroup}
                </span>
              </div>
            )}
            {member.memberSince && (
              <div className="flex items-center gap-2">
                <Church className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('membersPage.memberSince')}:</span>
                  {format(new Date(member.memberSince), "MMMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
          {member.selfSubmitted === "true" && (
            <div className="mt-3">
              <Badge variant="secondary" className="w-fit">
                {t('converts.selfSubmittedBadge')}
              </Badge>
            </div>
          )}
        </Section>

        {member.notes && (
          <Section title={t('forms.notes')}>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
              {member.notes}
            </p>
          </Section>
        )}

        <Section
          title={t('converts.followUpTimeline')}
          description={t('membersPage.recordAndTrackMembers')}
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
            {checkins && checkins.length > 0 ? (
              <div className="space-y-4">
                {checkins.map((checkin) => (
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
                        {checkin.scheduledByName && (
                          <p className="text-xs text-muted-foreground mb-1" data-testid={`text-scheduled-by-${checkin.id}`}>
                            {t('followUps.scheduledBy', { name: checkin.scheduledByName })}
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
                        {checkin.outcome === "SCHEDULED_VISIT" && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                          </div>
                        )}
                        {checkin.outcome !== "SCHEDULED_VISIT" && checkin.outcome !== "NOT_COMPLETED" && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                              <Edit className="h-4 w-4" />
                              {t('followUps.editNote')}
                            </Button>
                          </div>
                        )}
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

        <MemberScheduleFollowUpDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          memberId={memberId || ""}
          memberFirstName={member.firstName}
          memberLastName={member.lastName}
          memberPhone={member.phone}
        />

        <MemberAddNoteDialog
          open={noteDialogOpen}
          onOpenChange={(open) => {
            setNoteDialogOpen(open);
            if (!open) {
              setSelectedCheckinId(null);
              setEditingCheckin(null);
            }
          }}
          member={member ? { id: member.id, firstName: member.firstName, lastName: member.lastName } : null}
          checkinId={selectedCheckinId}
          initialValues={editingCheckin}
        />

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('membersPage.editMember')}</DialogTitle>
              <DialogDescription>
                {t('membersPage.updateMemberInfo')}
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.gender')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('forms.selectGender')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">{t('forms.male')}</SelectItem>
                            <SelectItem value="Female">{t('forms.female')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.ageGroup')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('forms.selectAgeGroup')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Under 18">{t('forms.under18')}</SelectItem>
                            <SelectItem value="18-24">{t('forms.age18to24')}</SelectItem>
                            <SelectItem value="25-34">{t('forms.age25to34')}</SelectItem>
                            <SelectItem value="35 and Above">{t('forms.age35plus')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="memberSince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('membersPage.memberSince')}</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          maxDate={new Date()}
                          data-testid="input-edit-member-since"
                        />
                      </FormControl>
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
                          context="Notes about a member in a ministry"
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
                    t('membersPage.updateMember')
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
