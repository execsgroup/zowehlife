import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, Link } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateOfBirthPicker } from "@/components/date-of-birth-picker";
import { DatePicker } from "@/components/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Convert, type Church } from "@shared/schema";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  User,
  Heart,
  Globe,
  Users,
  MessageSquare,
  Church as ChurchIcon,
  Cake,
  FileText,
  Edit,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

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

interface ConvertWithChurch extends Convert {
  church?: Church;
}

export default function AdminConvertDetail() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, params] = useRoute("/admin/converts/:id");
  const convertId = params?.id;
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const { data: convert, isLoading } = useQuery<ConvertWithChurch>({
    queryKey: ["/api/admin/converts", convertId],
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
      await apiRequest("PATCH", `/api/admin/converts/${convertId}`, data);
    },
    onSuccess: () => {
      toast({
        title: t('converts.convertUpdated'),
        description: t('converts.convertUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/converts", convertId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/converts"] });
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

  if (!convert) {
    return (
      <DashboardLayout>
        <Section>
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold mb-2">{t('converts.convertNotFound')}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('converts.convertNotFoundDesc')}
            </p>
            <Link href="/admin/converts">
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
        <Link href="/admin/converts">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            {t('converts.backToConverts')}
          </Button>
        </Link>

        <PageHeader
          title={`${convert.firstName} ${convert.lastName}`}
          description={`Convert Date: ${format(new Date(convert.createdAt), "MMMM d, yyyy")}${convert.church ? ` • Ministry: ${convert.church.name}` : ""}`}
          actions={
            <div className="flex items-center gap-2">
              <Badge className={statusColors[convert.status]}>
                {convert.status.replace("_", " ")}
              </Badge>
              <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1" data-testid="button-edit-convert">
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
                <ChurchIcon className="h-4 w-4 text-muted-foreground" />
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
                  <span className="text-xs text-muted-foreground mr-1">{t('converts.wouldLikeContact')}:</span>
                  {convert.wantsContact}
                </span>
              </div>
            )}
          </div>
          {convert.selfSubmitted === "true" && (
            <div className="mt-3">
              <Badge variant="secondary" className="w-fit">
                {t('converts.selfSubmitted')}
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
                      <FormLabel>{t('converts.salvationDecision')}</FormLabel>
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
                        <DateOfBirthPicker value={field.value || ""} onChange={field.onChange} maxDate={new Date()} data-testid="input-edit-dob" />
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
                            <SelectValue placeholder={t('forms.selectOption')} />
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
                        <FormLabel>{t('converts.wouldLikeContact')}</FormLabel>
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
                              <SelectValue placeholder={t('forms.selectOption')} />
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
                              <SelectValue placeholder={t('forms.selectOption')} />
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
                        <FormLabel>{t('converts.areYouMember')}</FormLabel>
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
                        <Textarea
                          placeholder={t('converts.prayerRequestPlaceholder')}
                          className="resize-none"
                          {...field}
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
                      <FormLabel>{t('converts.additionalNotesAdmin')}</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} data-testid="input-edit-notes" />
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
                          <SelectItem value="IN_PROGRESS">{t('statusLabels.in_progress')}</SelectItem>
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
      </div>
    </DashboardLayout>
  );
}
