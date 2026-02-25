import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { AITextarea } from "@/components/ai-text-helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type NewMember } from "@shared/schema";
import { Plus, Search, UserPlus, Phone, Mail, Loader2, CalendarPlus, Eye, ClipboardCheck, Clock, Church, Users2, Users, UserMinus, Video, Trash2, FileSpreadsheet, Upload, Copy, Link2 } from "lucide-react";
import { ExcelUploadDialog } from "@/components/excel-upload-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { NewMemberScheduleFollowUpDialog } from "@/components/new-member-schedule-followup-dialog";
import { useSortableTable } from "@/hooks/use-sortable-table";
import { SortableTableHead } from "@/components/sortable-table-head";

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
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Namibia", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const newMemberFormSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type NewMemberFormData = z.infer<typeof newMemberFormSchemaBase>;

const statusColors: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-muted",
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  CONNECTED: "bg-success/10 text-success border-success/20",
  NO_RESPONSE: "bg-coral/10 text-coral border-coral/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  NEEDS_FOLLOWUP: "bg-gold/10 text-gold border-gold/20",
  SCHEDULED_VISIT: "bg-primary/10 text-primary border-primary/20",
  REFERRED: "bg-primary/10 text-primary border-primary/20",
  NOT_COMPLETED: "bg-coral/10 text-coral border-coral/20",
  NEVER_CONTACTED: "bg-muted text-muted-foreground border-muted",
  ACTIVE: "bg-success/10 text-success border-success/20",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
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

const followUpNoteSchemaBase = z.object({
  checkinDate: z.string().min(1),
  notes: z.string().optional(),
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "OTHER"]),
});

type FollowUpNoteData = z.infer<typeof followUpNoteSchemaBase>;

export default function LeaderNewMembers() {
  const { t } = useTranslation();
  const apiBasePath = useApiBasePath();

  const newMemberFormSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  });

  const followUpNoteSchema = z.object({
    checkinDate: z.string().min(1, t('validation.dateRequired')),
    notes: z.string().optional(),
    outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "OTHER"]),
  });

  const { toast } = useToast();
  const basePath = useBasePath();
  const [location, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpNoteDialogOpen, setFollowUpNoteDialogOpen] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState<NewMember | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [convertToMemberDialogOpen, setConvertToMemberDialogOpen] = useState(false);
  const [finalFollowUpPromptOpen, setFinalFollowUpPromptOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [newMemberToRemove, setNewMemberToRemove] = useState<NewMember | null>(null);

  const statusLabels: Record<string, string> = {
    NEW: t('statusLabels.new'),
    SCHEDULED: t('statusLabels.scheduled'),
    CONNECTED: t('statusLabels.connected'),
    NO_RESPONSE: t('statusLabels.notConnected'),
    NEEDS_PRAYER: t('statusLabels.needsPrayer'),
    NEEDS_FOLLOWUP: t('statusLabels.needsFollowUp'),
    SCHEDULED_VISIT: t('statusLabels.scheduledVisit'),
    REFERRED: t('statusLabels.referred'),
    NOT_COMPLETED: t('statusLabels.notCompleted'),
    NEVER_CONTACTED: t('statusLabels.neverContacted'),
    ACTIVE: t('statusLabels.active'),
    IN_PROGRESS: t('statusLabels.inProgress'),
    INACTIVE: t('statusLabels.inactive'),
  };

  const followUpStageLabels: Record<string, string> = {
    NEW: t('followUpStageLabels.notStarted'),
    CONTACT_NEW_MEMBER: t('followUpStageLabels.needsContact'),
    SCHEDULED: t('followUpStageLabels.firstScheduled'),
    FIRST_COMPLETED: t('followUpStageLabels.firstCompleted'),
    INITIATE_SECOND: t('followUpStageLabels.readyForSecond'),
    SECOND_SCHEDULED: t('followUpStageLabels.secondScheduled'),
    SECOND_COMPLETED: t('followUpStageLabels.secondCompleted'),
    INITIATE_FINAL: t('followUpStageLabels.readyForFinal'),
    FINAL_SCHEDULED: t('followUpStageLabels.finalScheduled'),
    FINAL_COMPLETED: t('followUpStageLabels.completed'),
  };

  const { data: newMembers, isLoading } = useQuery<NewMember[]>({
    queryKey: [`${apiBasePath}/new-members`],
  });

  const { data: church } = useQuery<{ id: string; name: string }>({
    queryKey: [`${apiBasePath}/church`],
  });

  const { data: tokens } = useQuery<{ publicToken: string | null; newMemberToken: string | null; memberToken: string | null }>({
    queryKey: [`${apiBasePath}/church/tokens`],
  });

  const generateNewMemberTokenMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `${apiBasePath}/church/generate-new-member-token`, {});
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('common.savedSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/church/tokens`] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const copyNewMemberLink = () => {
    if (tokens?.newMemberToken) {
      const link = `${window.location.origin}/new-member/${tokens.newMemberToken}`;
      navigator.clipboard.writeText(link);
      toast({
        title: t('common.success'),
        description: t('common.savedSuccessfully'),
      });
    }
  };

  const removeMutation = useMutation({
    mutationFn: async (newMemberId: string) => {
      await apiRequest("DELETE", `${apiBasePath}/remove/new_member/${newMemberId}`);
    },
    onSuccess: async () => {
      toast({
        title: t('newMembers.newMemberRemoved'),
        description: t('newMembers.newMemberRemovedDesc'),
      });
      await queryClient.refetchQueries({ queryKey: [`${apiBasePath}/new-members`] });
      setRemoveDialogOpen(false);
      setNewMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const form = useForm<NewMemberFormData>({
    resolver: zodResolver(newMemberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: undefined,
      gender: undefined,
      ageGroup: undefined,
      address: "",
      notes: "",
    },
  });

  const followUpNoteForm = useForm<FollowUpNoteData>({
    resolver: zodResolver(followUpNoteSchema),
    defaultValues: {
      checkinDate: new Date().toISOString().split("T")[0],
      notes: "",
      outcome: "CONNECTED",
    },
  });

  useEffect(() => {
    if (location.includes("new=true")) {
      setDialogOpen(true);
    }
  }, [location]);

  const followUpNoteMutation = useMutation({
    mutationFn: async (data: FollowUpNoteData) => {
      if (!selectedNewMember) return null;
      const response = await apiRequest("POST", `${apiBasePath}/new-members/${selectedNewMember.id}/checkins`, data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: t('newMembers.noteAdded'),
        description: t('newMembers.noteAddedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      setFollowUpNoteDialogOpen(false);
      followUpNoteForm.reset();
      
      // Check if final follow-up was completed - show prompt to move to list
      if (result?.promptMoveToList) {
        setFinalFollowUpPromptOpen(true);
      } else {
        setSelectedNewMember(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const handleScheduleFollowUp = (newMember: NewMember) => {
    setSelectedNewMember(newMember);
    setFollowUpDialogOpen(true);
  };

  const handleFollowUpNote = (newMember: NewMember) => {
    setSelectedNewMember(newMember);
    followUpNoteForm.reset({
      checkinDate: new Date().toISOString().split("T")[0],
      notes: "",
      outcome: "CONNECTED",
    });
    setFollowUpNoteDialogOpen(true);
  };

  const handleViewDetails = (newMember: NewMember) => {
    setLocation(`${basePath}/new-members/${newMember.id}`);
  };

  const handleViewTimeline = (newMember: NewMember) => {
    setSelectedNewMember(newMember);
    setTimelineDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: NewMemberFormData) => {
      await apiRequest("POST", `${apiBasePath}/new-members`, data);
    },
    onSuccess: () => {
      toast({
        title: t('newMembers.newMemberAdded'),
        description: t('newMembers.newMemberAddedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const convertToMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `${apiBasePath}/new-members/${id}/convert-to-member`);
    },
    onSuccess: () => {
      toast({
        title: t('newMembers.movedToMembers'),
        description: t('newMembers.movedToMembersDesc'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      setConvertToMemberDialogOpen(false);
      setSelectedNewMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });


  const handleConvertToMember = (nm: NewMember) => {
    setSelectedNewMember(nm);
    setConvertToMemberDialogOpen(true);
  };

  const handleConvertToGuest = (nm: NewMember) => {
    setSelectedNewMember(nm);
    setConvertToGuestDialogOpen(true);
  };

  const filteredNewMembers = newMembers?.filter((nm) => {
    const matchesSearch =
      !search ||
      `${nm.firstName} ${nm.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      nm.phone?.includes(search) ||
      nm.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || nm.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const { sortedData: sortedNewMembers, sortConfig, requestSort } = useSortableTable(filteredNewMembers);

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    const response = await fetch(`${apiBasePath}/new-members/export-excel?${params}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `new-members-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('newMembers.title')}
          description={t('newMembers.description')}
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
                <FileSpreadsheet className="h-4 w-4" />
                {t('forms.exportExcel')}
              </Button>
              <Button onClick={() => setUploadDialogOpen(true)} variant="outline" className="gap-2" data-testid="button-upload-new-members">
                <Upload className="h-4 w-4" />
                {t('excelUpload.uploadFile')}
              </Button>
              {tokens?.newMemberToken ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="gap-2" onClick={copyNewMemberLink} data-testid="button-copy-new-member-link">
                      <Copy className="h-4 w-4" />
                      {t('newMembers.copyNewMemberLink')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('newMembers.copyNewMemberLinkTooltip')}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => generateNewMemberTokenMutation.mutate()}
                  disabled={generateNewMemberTokenMutation.isPending}
                  data-testid="button-generate-new-member-link"
                >
                  {generateNewMemberTokenMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  {t('newMembers.generateNewMemberLink')}
                </Button>
              )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-new-member">
                  <Plus className="h-4 w-4" />
                  {t('newMembers.addNewMember')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('newMembers.addNewMember')}</DialogTitle>
                  <DialogDescription>
                    {t('newMembers.recordInfo')}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="rounded-md border bg-muted/50 p-3">
                      <div className="flex items-center gap-2">
                        <Church className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t('forms.ministry')}:</span>
                        <span className="text-sm text-muted-foreground">{church?.name || t('forms.loading')}</span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.firstName')} *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('forms.firstName')}
                                {...field}
                                data-testid="input-new-member-firstname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.lastName')} *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('forms.lastName')}
                                {...field}
                                data-testid="input-new-member-lastname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.phone')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('forms.phone')}
                                {...field}
                                data-testid="input-new-member-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.email')}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={t('forms.email')}
                                {...field}
                                data-testid="input-new-member-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.gender')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-new-member-gender">
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
                        control={form.control}
                        name="ageGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.ageGroup')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-new-member-age-group">
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
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.dateOfBirth')}</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value || ""}
                              onChange={field.onChange}
                              maxDate={new Date()}
                              data-testid="input-new-member-dob"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.country')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-new-member-country">
                                <SelectValue placeholder={t('forms.selectCountry')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.address')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t('forms.address')}
                              {...field}
                              data-testid="input-new-member-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.notes')}</FormLabel>
                          <FormControl>
                            <AITextarea
                              placeholder={t('forms.additionalNotesPlaceholder')}
                              value={field.value || ""}
                              onChange={field.onChange}
                              context="Notes about a new member in a ministry"
                              data-testid="input-new-member-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-new-member"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t('forms.saving')}
                        </>
                      ) : (
                        t('newMembers.addNewMember')
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          }
        />

        <Section>
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('forms.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-new-members"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder={t('forms.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('forms.allStatuses')}</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredNewMembers?.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('newMembers.noNewMembers')}</h3>
                <p className="text-muted-foreground">
                  {t('newMembers.addFirstMember')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('forms.name')} sortKey="firstName" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableTableHead label={t('forms.contact')} sortKey="phone" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableTableHead label={t('forms.gender')} sortKey="gender" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableTableHead label={t('forms.status')} sortKey="followUpStage" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableTableHead label={t('forms.visitDate')} sortKey="visitDate" sortConfig={sortConfig} onSort={requestSort} />
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedNewMembers?.map((nm) => (
                      <TableRow key={nm.id} data-testid={`row-new-member-${nm.id}`}>
                        <TableCell>
                          <div 
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => handleViewDetails(nm)}
                            data-testid={`link-view-details-${nm.id}`}
                          >
                            {nm.firstName} {nm.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {nm.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {nm.phone}
                              </div>
                            )}
                            {nm.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {nm.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{nm.gender || "-"}</TableCell>
                        <TableCell>
                          {(nm as any).lastFollowupOutcome ? (
                            <Badge className={statusColors[(nm as any).lastFollowupOutcome] || "bg-muted text-muted-foreground"}>
                              {statusLabels[(nm as any).lastFollowupOutcome] || (nm as any).lastFollowupOutcome}
                            </Badge>
                          ) : (
                            <Badge className={statusColors[nm.status] || ""}>
                              {statusLabels[nm.status] || nm.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {nm.createdAt ? format(new Date(nm.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedNewMember(nm);
                                    setFollowUpDialogOpen(true);
                                  }}
                                  data-testid={`button-schedule-followup-${nm.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('followUps.scheduleFollowUp')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => handleFollowUpNote(nm)}
                                  data-testid={`button-followup-note-${nm.id}`}
                                >
                                  <ClipboardCheck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('followUps.followUpNote')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => handleViewTimeline(nm)}
                                  data-testid={`button-view-timeline-${nm.id}`}
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('newMembers.followUpTimeline')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => handleConvertToMember(nm)}
                                  data-testid={`button-move-to-member-${nm.id}`}
                                >
                                  <Church className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('newMembers.moveToMembers')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => {
                                    setNewMemberToRemove(nm);
                                    setRemoveDialogOpen(true);
                                  }}
                                  data-testid={`button-remove-new-member-${nm.id}`}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.removeFromMinistry')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Convert to Member Confirmation Dialog */}
      <Dialog open={convertToMemberDialogOpen} onOpenChange={setConvertToMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newMembers.moveToMembers')}</DialogTitle>
            <DialogDescription>
              {t('newMembers.moveToMembersConfirm', { name: `${selectedNewMember?.firstName} ${selectedNewMember?.lastName}` })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConvertToMemberDialogOpen(false)}>
              {t('forms.cancel')}
            </Button>
            <Button 
              onClick={() => selectedNewMember && convertToMemberMutation.mutate(selectedNewMember.id)}
              disabled={convertToMemberMutation.isPending}
              data-testid="button-confirm-move-to-member"
            >
              {convertToMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('forms.saving')}
                </>
              ) : (
                t('newMembers.moveToMembers')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Follow-Up Completed Prompt */}
      <Dialog open={finalFollowUpPromptOpen} onOpenChange={(open) => {
        setFinalFollowUpPromptOpen(open);
        if (!open) setSelectedNewMember(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newMembers.finalFollowUpCompleted')}</DialogTitle>
            <DialogDescription>
              {t('newMembers.finalFollowUpDesc', { name: `${selectedNewMember?.firstName} ${selectedNewMember?.lastName}` })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => {
                setFinalFollowUpPromptOpen(false);
                setConvertToMemberDialogOpen(true);
              }}
              data-testid="button-prompt-move-to-members"
            >
              <Users className="h-4 w-4 mr-2" />
              {t('newMembers.moveToMembers')}
            </Button>
            <Button 
              variant="ghost"
              onClick={() => {
                setFinalFollowUpPromptOpen(false);
                setSelectedNewMember(null);
              }}
              data-testid="button-prompt-decide-later"
            >
              {t('newMembers.decideLater')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Follow Up Note Dialog */}
      <Dialog open={followUpNoteDialogOpen} onOpenChange={setFollowUpNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('followUps.followUpNote')}</DialogTitle>
            <DialogDescription>
              {t('followUps.recordNoteDesc', { name: `${selectedNewMember?.firstName} ${selectedNewMember?.lastName}` })}
            </DialogDescription>
          </DialogHeader>
          <Form {...followUpNoteForm}>
            <form
              onSubmit={followUpNoteForm.handleSubmit((data) => followUpNoteMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={followUpNoteForm.control}
                name="checkinDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.date')} *</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} data-testid="input-note-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={followUpNoteForm.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('followUps.outcome')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-note-outcome">
                          <SelectValue placeholder={t('forms.selectOutcome')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONNECTED">{t('statusLabels.connected')}</SelectItem>
                        <SelectItem value="NO_RESPONSE">{t('statusLabels.noResponse')}</SelectItem>
                        <SelectItem value="NEEDS_FOLLOWUP">{t('statusLabels.needsFollowUp')}</SelectItem>
                        <SelectItem value="OTHER">{t('statusLabels.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={followUpNoteForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.notes')}</FormLabel>
                    <FormControl>
                      <AITextarea
                        placeholder={t('forms.notes')}
                        value={field.value || ""}
                        onChange={field.onChange}
                        context="Follow-up note for a new member in a ministry"
                        data-testid="input-note-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={followUpNoteMutation.isPending}
                data-testid="button-submit-note"
              >
                {followUpNoteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('forms.saving')}
                  </>
                ) : (
                  t('forms.saveNote')
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <TimelineDialog
        open={timelineDialogOpen}
        onOpenChange={setTimelineDialogOpen}
        newMember={selectedNewMember}
      />

      {/* Remove New Member Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.removeFromMinistry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.removeConfirm', { name: `${newMemberToRemove?.firstName} ${newMemberToRemove?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forms.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => newMemberToRemove && removeMutation.mutate(newMemberToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-new-member"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('forms.saving')}
                </>
              ) : (
                t('forms.remove')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExcelUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        entityType="new-members"
        apiPath={apiBasePath + "/new-members"}
        invalidateKeys={[`${apiBasePath}/new-members`, `${apiBasePath}/stats`]}
        expectedColumns={[
          { key: "firstName", label: t('forms.firstName'), required: true },
          { key: "lastName", label: t('forms.lastName'), required: true },
          { key: "email", label: t('forms.email'), required: false },
          { key: "phone", label: t('forms.phone'), required: false },
          { key: "dateOfBirth", label: t('forms.dateOfBirth'), required: false },
          { key: "address", label: t('forms.address'), required: false },
          { key: "country", label: t('forms.country'), required: false },
          { key: "gender", label: t('forms.gender'), required: false },
          { key: "ageGroup", label: t('forms.ageGroup'), required: false },
          { key: "notes", label: t('forms.notes'), required: false },
        ]}
      />
    </DashboardLayout>
  );
}

function TimelineDialog({
  open,
  onOpenChange,
  newMember,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newMember: NewMember | null;
}) {
  const apiBasePath = useApiBasePath();

  const { data: checkins, isLoading } = useQuery({
    queryKey: [`${apiBasePath}/new-members`, newMember?.id, "checkins"],
    queryFn: async () => {
      if (!newMember) return [];
      const res = await fetch(`${apiBasePath}/new-members/${newMember.id}/checkins`);
      if (!res.ok) throw new Error("Failed to fetch checkins");
      return res.json();
    },
    enabled: !!newMember && open,
  });

  const { t } = useTranslation();
  const outcomeLabels: Record<string, string> = {
    CONNECTED: t('statusLabels.connected'),
    NO_RESPONSE: t('statusLabels.noResponse'),
    NEEDS_PRAYER: t('statusLabels.needsPrayer'),
    NEEDS_FOLLOWUP: t('statusLabels.needsFollowUp'),
    SCHEDULED_VISIT: t('statusLabels.scheduledVisit'),
    REFERRED: t('statusLabels.referred'),
    OTHER: t('statusLabels.other'),
    NOT_COMPLETED: t('statusLabels.notCompleted'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('newMembers.followUpTimeline')}</DialogTitle>
          <DialogDescription>
            {newMember?.firstName} {newMember?.lastName}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : checkins?.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">{t('followUps.noFollowUps')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkins?.map((checkin: any) => (
              <Card key={checkin.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {format(new Date(checkin.checkinDate + "T00:00:00"), "MMMM d, yyyy")}
                      </p>
                      <Badge variant="outline">{outcomeLabels[checkin.outcome]}</Badge>
                      {checkin.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{checkin.notes}</p>
                      )}
                      {checkin.nextFollowupDate && (
                        <p className="text-sm text-muted-foreground">
                          {t('converts.nextFollowUp')}: {format(new Date(checkin.nextFollowupDate + "T00:00:00"), "MMM d, yyyy")}
                          {checkin.nextFollowupTime && <span> {t('common.at')} {(() => { const [h, m] = checkin.nextFollowupTime.split(':').map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}</span>}
                        </p>
                      )}
                    </div>
                    {checkin.videoLink && (
                      <a
                        href={checkin.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Button size="sm" variant="outline" className="gap-2">
                          <Video className="h-4 w-4" />
                          {t('converts.joinMeeting')}
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
