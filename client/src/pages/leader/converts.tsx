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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Convert } from "@shared/schema";
import { Plus, Search, UserPlus, Phone, Mail, Loader2, FileSpreadsheet, CalendarPlus, Eye, UserMinus, Church } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ConvertScheduleFollowUpDialog } from "@/components/convert-schedule-followup-dialog";

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

const convertFormSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
  wantsContact: z.enum(["Yes", "No"]).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  isChurchMember: z.enum(["Yes", "No"]).optional(),
  prayerRequest: z.string().optional(),
  address: z.string().optional(),
  summaryNotes: z.string().optional(),
  status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]),
});

type ConvertFormData = z.infer<typeof convertFormSchemaBase>;

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  CONNECTED: "bg-coral/10 text-coral border-coral/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  REFERRED: "bg-accent/10 text-accent border-accent/20",
  NOT_COMPLETED: "bg-destructive/10 text-destructive border-destructive/20",
  NEVER_CONTACTED: "bg-gold/10 text-gold border-gold/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

export default function LeaderConverts() {
  const { t } = useTranslation();

  const convertFormSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
    wantsContact: z.enum(["Yes", "No"]).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
    isChurchMember: z.enum(["Yes", "No"]).optional(),
    prayerRequest: z.string().optional(),
    address: z.string().optional(),
    summaryNotes: z.string().optional(),
    status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]),
  });

  const { toast } = useToast();
  const basePath = useBasePath();
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedConvert, setSelectedConvert] = useState<Convert | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [convertToRemove, setConvertToRemove] = useState<Convert | null>(null);

  const statusLabels: Record<string, string> = {
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

  const { data: converts, isLoading } = useQuery<Convert[]>({
    queryKey: ["/api/leader/converts"],
  });

  const { data: church } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/leader/church"],
  });

  const removeMutation = useMutation({
    mutationFn: async (convertId: string) => {
      await apiRequest("DELETE", `/api/leader/remove/convert/${convertId}`);
    },
    onSuccess: async () => {
      toast({
        title: t('converts.convertRemoved'),
        description: t('converts.convertRemovedDesc'),
      });
      await queryClient.refetchQueries({ queryKey: ["/api/leader/converts"] });
      setRemoveDialogOpen(false);
      setConvertToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: undefined,
      salvationDecision: undefined,
      wantsContact: undefined,
      gender: undefined,
      ageGroup: undefined,
      isChurchMember: undefined,
      prayerRequest: "",
      address: "",
      summaryNotes: "",
      status: "NEW",
    },
  });

  useEffect(() => {
    if (location.includes("new=true")) {
      setDialogOpen(true);
    }
  }, [location]);

  const handleScheduleFollowUp = (convert: Convert) => {
    setSelectedConvert(convert);
    setFollowUpDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ConvertFormData) => {
      await apiRequest("POST", "/api/leader/converts", data);
    },
    onSuccess: () => {
      toast({
        title: t('converts.convertAdded'),
        description: t('converts.convertAddedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/stats"] });
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

  const filteredConverts = converts?.filter((convert) => {
    const matchesSearch =
      !search ||
      `${convert.firstName} ${convert.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      convert.phone?.includes(search) ||
      convert.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || convert.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const response = await fetch(`/api/leader/converts/export-excel?${params}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('converts.title')}
          description={t('converts.description')}
          actions={
            <div className="flex gap-2">
              <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
                <FileSpreadsheet className="h-4 w-4" />
                {t('forms.exportExcel')}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-convert">
                  <Plus className="h-4 w-4" />
                  {t('converts.addConvert')}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('converts.addConvert')}</DialogTitle>
                <DialogDescription>
                  {t('converts.recordInfo')}
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

                  <FormField
                    control={form.control}
                    name="salvationDecision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('converts.salvationDecision')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-salvation-decision">
                              <SelectValue placeholder={t('forms.selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I just made Jesus Christ my Lord and Savior">
                              {t('converts.salvationOption1')}
                            </SelectItem>
                            <SelectItem value="I have rededicated my life to Jesus">
                              {t('converts.salvationOption2')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                              data-testid="input-convert-firstname"
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
                              data-testid="input-convert-lastname"
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
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              {...field}
                              data-testid="input-convert-phone"
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
                              placeholder="email@example.com"
                              {...field}
                              data-testid="input-convert-email"
                            />
                          </FormControl>
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
                            data-testid="input-convert-dob"
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
                            <SelectTrigger data-testid="select-country">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.gender')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
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
                              <SelectTrigger data-testid="select-age-group">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="wantsContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.wantsContact')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-wants-contact">
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
                    control={form.control}
                    name="prayerRequest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('converts.prayerRequest')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('converts.prayerRequest')}
                            className="resize-none"
                            {...field}
                            data-testid="input-prayer-request"
                          />
                        </FormControl>
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
                          <Input
                            placeholder={t('forms.address')}
                            {...field}
                            data-testid="input-convert-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="summaryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.notes')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('forms.notes')}
                            className="resize-none"
                            {...field}
                            data-testid="input-convert-notes"
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
                      onClick={() => setDialogOpen(false)}
                    >
                      {t('forms.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-save-convert"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('forms.saving')}
                        </>
                      ) : (
                        t('converts.addConvert')
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
            </div>
          }
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('forms.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-converts"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
              <SelectValue placeholder={t('forms.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('forms.allStatuses')}</SelectItem>
              <SelectItem value="NEW">{t('statusLabels.new')}</SelectItem>
              <SelectItem value="SCHEDULED">{t('statusLabels.scheduled')}</SelectItem>
              <SelectItem value="CONNECTED">{t('statusLabels.connected')}</SelectItem>
              <SelectItem value="NO_RESPONSE">{t('statusLabels.noResponse')}</SelectItem>
              <SelectItem value="NEEDS_PRAYER">{t('statusLabels.needsPrayer')}</SelectItem>
              <SelectItem value="REFERRED">{t('statusLabels.referred')}</SelectItem>
              <SelectItem value="NOT_COMPLETED">{t('statusLabels.notCompleted')}</SelectItem>
              <SelectItem value="NEVER_CONTACTED">{t('statusLabels.neverContacted')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Section noPadding>
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConverts && filteredConverts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('forms.name')}</TableHead>
                    <TableHead>{t('forms.dateOfBirth')}</TableHead>
                    <TableHead>{t('forms.contact')}</TableHead>
                    <TableHead>{t('forms.status')}</TableHead>
                    <TableHead>{t('forms.convertDate')}</TableHead>
                    <TableHead className="text-right">{t('forms.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConverts.map((convert) => (
                    <TableRow key={convert.id} data-testid={`row-convert-${convert.id}`}>
                      <TableCell>
                        <Link href={`${basePath}/converts/${convert.id}`}>
                          <span className="font-medium hover:underline cursor-pointer" data-testid={`link-convert-name-${convert.id}`}>
                            {convert.firstName} {convert.lastName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell data-testid={`text-dob-${convert.id}`}>
                        {convert.dateOfBirth ? new Date(convert.dateOfBirth).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {convert.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {convert.phone}
                            </div>
                          )}
                          {convert.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {convert.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[convert.status] || ""}>
                          {statusLabels[convert.status] || convert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(convert.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleScheduleFollowUp(convert)}
                                data-testid={`button-schedule-followup-${convert.id}`}
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('followUps.scheduleFollowUp')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`${basePath}/converts/${convert.id}`}>
                                <Button
                                  variant="default"
                                  size="icon"
                                  data-testid={`button-view-convert-${convert.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>{t('common.view')} {t('converts.convertDetails')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  setConvertToRemove(convert);
                                  setRemoveDialogOpen(true);
                                }}
                                data-testid={`button-remove-convert-${convert.id}`}
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
            ) : (
              <div className="p-12 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('converts.noConverts')}</h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== "all"
                    ? t('common.tryDifferentSearch')
                    : t('converts.addFirstConvert')}
                </p>
                {!search && statusFilter === "all" && (
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('converts.addConvert')}
                  </Button>
                )}
              </div>
            )}
        </Section>
      </div>

      <ConvertScheduleFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        convert={selectedConvert}
      />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.removeFromMinistry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.removeConfirm', { name: `${convertToRemove?.firstName} ${convertToRemove?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forms.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => convertToRemove && removeMutation.mutate(convertToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-convert"
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
    </DashboardLayout>
  );
}
