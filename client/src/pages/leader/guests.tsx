import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { AITextarea } from "@/components/ai-text-helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Guest } from "@shared/schema";
import { Plus, Search, Users2, Phone, Mail, Loader2, Eye, Trash2, Edit, Upload } from "lucide-react";
import { ExcelUploadDialog } from "@/components/excel-upload-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

const guestFormSchemaBase = z.object({
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

type GuestFormData = z.infer<typeof guestFormSchemaBase>;

export default function LeaderGuests() {
  const { t } = useTranslation();

  const guestFormSchema = z.object({
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

  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [search, setSearch] = useState("");

  const { data: guests, isLoading } = useQuery<Guest[]>({
    queryKey: [`${apiBasePath}/guests`],
  });

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: "",
      gender: undefined,
      ageGroup: undefined,
      address: "",
      notes: "",
    },
  });

  const editForm = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: "",
      gender: undefined,
      ageGroup: undefined,
      address: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GuestFormData) => {
      await apiRequest("POST", `${apiBasePath}/guests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/guests`] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: t('guests.guestAdded'),
        description: t('guests.guestAddedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GuestFormData }) => {
      await apiRequest("PATCH", `${apiBasePath}/guests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/guests`] });
      setEditDialogOpen(false);
      setSelectedGuest(null);
      editForm.reset();
      toast({
        title: t('common.success'),
        description: t('common.updatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `${apiBasePath}/guests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/guests`] });
      setDeleteDialogOpen(false);
      setSelectedGuest(null);
      toast({
        title: t('guests.guestRemoved'),
        description: t('guests.guestRemovedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GuestFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: GuestFormData) => {
    if (selectedGuest) {
      updateMutation.mutate({ id: selectedGuest.id, data });
    }
  };

  const handleEdit = (guest: Guest) => {
    setSelectedGuest(guest);
    editForm.reset({
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone || "",
      email: guest.email || "",
      dateOfBirth: guest.dateOfBirth || "",
      country: guest.country || "",
      gender: guest.gender as "Male" | "Female" | undefined,
      ageGroup: guest.ageGroup as "Under 18" | "18-24" | "25-34" | "35 and Above" | undefined,
      address: guest.address || "",
      notes: guest.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (guest: Guest) => {
    setSelectedGuest(guest);
    setDeleteDialogOpen(true);
  };

  const handleView = (guest: Guest) => {
    setSelectedGuest(guest);
    setViewDialogOpen(true);
  };

  const { sortedData: sortedGuests, sortConfig, requestSort } = useSortableTable(guests);

  const filteredGuests = sortedGuests?.filter((g) => {
    const searchLower = search.toLowerCase();
    return (
      g.firstName.toLowerCase().includes(searchLower) ||
      g.lastName.toLowerCase().includes(searchLower) ||
      (g.phone && g.phone.toLowerCase().includes(searchLower)) ||
      (g.email && g.email.toLowerCase().includes(searchLower))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('sidebar.guests')}
          description={t('guests.description')}
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setUploadDialogOpen(true)} variant="outline" className="gap-2" data-testid="button-upload-guests">
                <Upload className="h-4 w-4" />
                {t('excelUpload.uploadFile')}
              </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-guest">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('guests.addGuest')}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('guests.addGuest')}</DialogTitle>
                <DialogDescription>
                  {t('guests.description')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.firstName')} *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
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
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.phone')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
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
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.dateOfBirth')}</FormLabel>
                          <FormControl>
                            <DatePicker value={field.value || ""} onChange={field.onChange} maxDate={new Date()} data-testid="input-dob" />
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
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.address')}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-address" />
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
                            value={field.value || ""}
                            onChange={field.onChange}
                            context="Notes about a guest/convert in a ministry"
                            rows={3}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      {t('forms.cancel')}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-guest">
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('guests.addGuest')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
            </div>
          }
        />

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('forms.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-guests"
          />
        </div>

        <Section noPadding>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredGuests?.length === 0 ? (
              <div className="text-center py-8">
                <Users2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{t('guests.noGuests')}</h3>
                <p className="text-muted-foreground">
                  {search ? t('common.tryDifferentSearch') : t('guests.addFirstGuest')}
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
                      <SortableTableHead label={t('forms.ageGroup')} sortKey="ageGroup" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableTableHead label={t('guests.source')} sortKey="sourceType" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableTableHead label={t('forms.date')} sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort} />
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuests?.map((g) => (
                      <TableRow key={g.id} data-testid={`row-guest-${g.id}`}>
                        <TableCell>
                          <div 
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => handleView(g)}
                            data-testid={`link-view-details-${g.id}`}
                          >
                            {g.firstName} {g.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {g.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {g.phone}
                              </div>
                            )}
                            {g.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {g.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{g.gender || "-"}</TableCell>
                        <TableCell>{g.ageGroup || "-"}</TableCell>
                        <TableCell>
                          {g.sourceType === "new_member" ? (
                            <Badge variant="outline">{t('newMembers.title')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('guests.manualEntry')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {g.createdAt ? format(new Date(g.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleEdit(g)}
                                  data-testid={`button-edit-guest-${g.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('guests.editGuest')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDelete(g)}
                                  data-testid={`button-delete-guest-${g.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('forms.remove')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </Section>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('guests.title')} {t('common.details')}</DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.name')}</p>
                  <p className="font-medium">{selectedGuest.firstName} {selectedGuest.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.gender')}</p>
                  <p className="font-medium">{selectedGuest.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.phone')}</p>
                  <p className="font-medium">{selectedGuest.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.email')}</p>
                  <p className="font-medium">{selectedGuest.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.dateOfBirth')}</p>
                  <p className="font-medium">{selectedGuest.dateOfBirth || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.ageGroup')}</p>
                  <p className="font-medium">{selectedGuest.ageGroup || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.country')}</p>
                  <p className="font-medium">{selectedGuest.country || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('guests.source')}</p>
                  <p className="font-medium">
                    {selectedGuest.sourceType === "new_member" ? t('newMembers.title') : t('guests.manualEntry')}
                  </p>
                </div>
              </div>
              {selectedGuest.address && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.address')}</p>
                  <p className="font-medium">{selectedGuest.address}</p>
                </div>
              )}
              {selectedGuest.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('forms.notes')}</p>
                  <p className="font-medium">{selectedGuest.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('guests.editGuest')}</DialogTitle>
            <DialogDescription>
              {t('guests.description')}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.dateOfBirth')}</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value || ""} onChange={field.onChange} maxDate={new Date()} />
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
                      <FormLabel>{t('forms.country')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
              </div>

              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                        context="Notes about a guest/convert in a ministry"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {t('forms.cancel')}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('forms.save')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('forms.remove')} {t('guests.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('guests.removeConfirm', { name: `${selectedGuest?.firstName} ${selectedGuest?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forms.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedGuest && deleteMutation.mutate(selectedGuest.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('forms.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExcelUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        entityType="guests"
        apiPath={apiBasePath + "/guests"}
        invalidateKeys={[`${apiBasePath}/guests`, `${apiBasePath}/stats`]}
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
