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
import { type Convert, type Checkin } from "@shared/schema";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Loader2,
  Download,
  FileText,
  Edit,
  User,
  Heart,
  Globe,
  Users,
  MessageSquare,
  Church,
  Cake,
  Video,
  CalendarPlus,
} from "lucide-react";
import { format } from "date-fns";
import { ConvertScheduleFollowUpDialog } from "@/components/convert-schedule-followup-dialog";
import { ConvertAddNoteDialog } from "@/components/convert-add-note-dialog";


const updateConvertSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus", ""]).optional(),
  wantsContact: z.enum(["Yes", "No", ""]).optional(),
  gender: z.enum(["Male", "Female", ""]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
  isChurchMember: z.enum(["Yes", "No", ""]).optional(),
  prayerRequest: z.string().optional(),
  summaryNotes: z.string().optional(),
  status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]),
});

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia",
  "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

type UpdateConvertData = z.infer<typeof updateConvertSchemaBase>;

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  CONNECTED: "bg-coral/10 text-coral border-coral/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

interface ConvertWithCheckins extends Convert {
  checkins: Checkin[];
}

export default function ConvertDetail() {
  const { t } = useTranslation();

  const updateConvertSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus", ""]).optional(),
    wantsContact: z.enum(["Yes", "No", ""]).optional(),
    gender: z.enum(["Male", "Female", ""]).optional(),
    ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
    isChurchMember: z.enum(["Yes", "No", ""]).optional(),
    prayerRequest: z.string().optional(),
    summaryNotes: z.string().optional(),
    status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]),
  });

  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [location] = useLocation();
  const convertId = location.split('/').pop();

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
      ACTIVE: t('statusLabels.active'),
      IN_PROGRESS: t('statusLabels.inProgress'),
      CONNECTED: t('statusLabels.connected'),
      INACTIVE: t('statusLabels.inactive'),
    };
    return labels[key] || key;
  };

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: convert, isLoading } = useQuery<ConvertWithCheckins>({
    queryKey: [`${apiBasePath}/converts`, convertId],
    enabled: !!convertId,
  });

  const editForm = useForm<UpdateConvertData>({
    resolver: zodResolver(updateConvertSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: "",
      salvationDecision: "",
      wantsContact: "",
      gender: "",
      ageGroup: "",
      isChurchMember: "",
      prayerRequest: "",
      summaryNotes: "",
      status: "NEW",
    },
  });

  // Populate edit form when convert data loads
  const openEditDialog = () => {
    if (convert) {
      editForm.reset({
        firstName: convert.firstName,
        lastName: convert.lastName,
        phone: convert.phone || "",
        email: convert.email || "",
        dateOfBirth: convert.dateOfBirth || "",
        country: convert.country || "",
        salvationDecision: (convert.salvationDecision || "") as "" | "I just made Jesus Christ my Lord and Savior" | "I have rededicated my life to Jesus",
        wantsContact: (convert.wantsContact || "") as "" | "Yes" | "No",
        gender: (convert.gender || "") as "" | "Male" | "Female",
        ageGroup: (convert.ageGroup || "") as "" | "Under 18" | "18-24" | "25-34" | "35 and Above",
        isChurchMember: (convert.isChurchMember || "") as "" | "Yes" | "No",
        prayerRequest: convert.prayerRequest || "",
        summaryNotes: convert.summaryNotes || "",
        status: convert.status,
      });
    }
    setEditDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateConvertData) => {
      await apiRequest("PATCH", `${apiBasePath}/converts/${convertId}`, data);
    },
    onSuccess: () => {
      toast({
        title: t('converts.convertUpdated'),
        description: t('converts.convertUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`, convertId] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
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

  const downloadICS = (checkin: Checkin) => {
    if (!checkin.nextFollowupDate || !convert) return;

    const date = new Date(checkin.nextFollowupDate);
    const dateStr = format(date, "yyyyMMdd");
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Zoweh Life//EN
BEGIN:VEVENT
DTSTART:${dateStr}
DTEND:${dateStr}
SUMMARY:Follow-up: ${convert.firstName} ${convert.lastName}
DESCRIPTION:Scheduled follow-up for ${convert.firstName} ${convert.lastName}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `followup-${convert.firstName}-${convert.lastName}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  if (!convert) {
    return (
      <DashboardLayout>
        <Section>
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold mb-2">{t('converts.convertNotFound')}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('converts.convertNotFoundDesc')}
            </p>
            <Link href={`${basePath}/converts`}>
              <Button>{t('converts.backToConverts')}</Button>
            </Link>
          </div>
        </Section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href={`${basePath}/converts`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            {t('converts.backToConverts')}
          </Button>
        </Link>

        <PageHeader
          title={`${convert.firstName} ${convert.lastName}`}
          description={`${t('forms.convertDate')}: ${format(new Date(convert.createdAt), "MMMM d, yyyy")}`}
          actions={
            <div className="flex items-center gap-2">
              <Badge className={statusColors[convert.status]}>
                {getStatusLabel(convert.status)}
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
            {convert.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${convert.phone}`} className="hover:underline">
                  {convert.phone}
                </a>
              </div>
            )}
            {convert.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${convert.email}`} className="hover:underline">
                  {convert.email}
                </a>
              </div>
            )}
            {convert.address && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{convert.address}</span>
              </div>
            )}
            {convert.country && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{convert.country}</span>
              </div>
            )}
          </div>
        </Section>

        <Section title={t('converts.personalDetails')}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {convert.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.dateOfBirth')}:</span>
                  {format(new Date(convert.dateOfBirth), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {convert.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.gender')}:</span>
                  {convert.gender}
                </span>
              </div>
            )}
            {convert.ageGroup && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('forms.ageGroup')}:</span>
                  {convert.ageGroup}
                </span>
              </div>
            )}
          </div>
        </Section>

        <Section title={t('converts.faithJourney')}>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            {convert.salvationDecision && (
              <div className="flex items-start gap-2 md:col-span-2">
                <Heart className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('converts.decision')}:</span>
                  {convert.salvationDecision}
                </span>
              </div>
            )}
            {convert.isChurchMember !== null && convert.isChurchMember !== undefined && (
              <div className="flex items-center gap-2">
                <Church className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('converts.ministryMember')}:</span>
                  {convert.isChurchMember}
                </span>
              </div>
            )}
            {convert.wantsContact !== null && convert.wantsContact !== undefined && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">{t('converts.wantsContact')}:</span>
                  {convert.wantsContact}
                </span>
              </div>
            )}
          </div>
          {convert.selfSubmitted === "true" && (
            <div className="mt-3">
              <Badge variant="secondary" className="w-fit">
                {t('converts.selfSubmittedBadge')}
              </Badge>
            </div>
          )}
        </Section>

        {convert.prayerRequest && (
          <Section title={t('converts.prayerRequest')}>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
              {convert.prayerRequest}
            </p>
          </Section>
        )}

        {convert.summaryNotes && (
          <Section title={t('converts.additionalNotes')}>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {convert.summaryNotes}
            </p>
          </Section>
        )}

        <Section
          title={t('converts.followUpTimeline')}
          description={t('converts.recordAndTrackConverts')}
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
            {convert.checkins && convert.checkins.length > 0 ? (
              <div className="space-y-4">
                {convert.checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0"
                    data-testid={`checkin-${checkin.id}`}
                  >
                    <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {!(checkin.outcome === "SCHEDULED_VISIT" && checkin.nextFollowupDate) && (
                            <span className="font-medium">
                              {format(new Date(checkin.checkinDate), "MMMM d, yyyy")}
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
                              {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
                              {checkin.nextFollowupTime && <span> {t('common.at')} {(() => { const [h, m] = checkin.nextFollowupTime.split(':').map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}</span>}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => downloadICS(checkin)}
                              data-testid={`button-download-ics-${checkin.id}`}
                            >
                              <Download className="h-3 w-3" />
                              .ics
                            </Button>
                          </div>
                        )}
                        {(checkin.outcome === "SCHEDULED_VISIT" || 
                          (checkin.nextFollowupDate && new Date(checkin.nextFollowupDate) >= new Date(new Date().setHours(0,0,0,0)))) && (
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
                                setSelectedCheckinId(checkin.outcome === "SCHEDULED_VISIT" ? checkin.id : null);
                                setNoteDialogOpen(true);
                              }}
                              data-testid={`button-add-note-${checkin.id}`}
                            >
                              <Plus className="h-4 w-4" />
                              {t('converts.addNote')}
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('converts.editConvert')}</DialogTitle>
              <DialogDescription>
                {t('converts.updateInfoFor', { name: `${convert.firstName} ${convert.lastName}` })}
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={editForm.control}
                  name="salvationDecision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.salvationDecision')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-salvation">
                            <SelectValue placeholder={t('forms.selectOption')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="I just made Jesus Christ my Lord and Savior">{t('converts.salvationOption1')}</SelectItem>
                          <SelectItem value="I have rededicated my life to Jesus">{t('converts.salvationOption2')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.firstName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-firstname" />
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
                          <Input {...field} data-testid="input-edit-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.phoneNumber')}</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1 (555) 000-0000" {...field} data-testid="input-edit-phone" />
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
                      <FormLabel>{t('forms.emailAddress')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.dateOfBirth')}</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          maxDate={new Date()}
                          data-testid="input-edit-dob"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.countryOfResidence')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-country">
                            <SelectValue placeholder={t('forms.selectCountry')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="wantsContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('converts.wantsContactQuestion')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-wants-contact">
                              <SelectValue placeholder={t('forms.selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">{t('forms.yes')}</SelectItem>
                            <SelectItem value="No">{t('forms.no')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.gender')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-gender">
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.ageGroup')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-age-group">
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

                  <FormField
                    control={editForm.control}
                    name="isChurchMember"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('converts.churchMemberQuestion')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-church-member">
                              <SelectValue placeholder={t('forms.selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">{t('forms.yes')}</SelectItem>
                            <SelectItem value="No">{t('forms.no')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="prayerRequest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('converts.prayerRequestLabel')}</FormLabel>
                      <FormControl>
                        <AITextarea
                          placeholder={t('converts.prayerRequestPlaceholder')}
                          value={field.value || ""}
                          onChange={field.onChange}
                          context="Prayer request or additional information for a convert"
                          data-testid="input-edit-prayer-request"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="summaryNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('converts.additionalNotesLeader')}</FormLabel>
                      <FormControl>
                        <AITextarea
                          value={field.value || ""}
                          onChange={field.onChange}
                          context="Leader notes about a convert"
                          data-testid="input-edit-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEW">{t('statusLabels.new')}</SelectItem>
                          <SelectItem value="ACTIVE">{t('statusLabels.active')}</SelectItem>
                          <SelectItem value="IN_PROGRESS">{t('statusLabels.inProgress')}</SelectItem>
                          <SelectItem value="CONNECTED">{t('statusLabels.connected')}</SelectItem>
                          <SelectItem value="INACTIVE">{t('statusLabels.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    {t('forms.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('forms.saving')}
                      </>
                    ) : (
                      t('forms.saveChanges')
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <ConvertAddNoteDialog
          open={noteDialogOpen}
          onOpenChange={(open) => {
            setNoteDialogOpen(open);
            if (!open) setSelectedCheckinId(null);
          }}
          convert={convert}
          checkinId={selectedCheckinId}
        />

        <ConvertScheduleFollowUpDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          convert={convert}
        />
      </div>
    </DashboardLayout>
  );
}
