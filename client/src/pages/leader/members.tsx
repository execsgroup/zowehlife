import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Member } from "@shared/schema";
import { Plus, Search, Users, Phone, Mail, Loader2, Eye, Copy, Link2, UserMinus, Church, CalendarPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { MemberScheduleFollowUpDialog } from "@/components/member-schedule-followup-dialog";

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

const statusColors: Record<string, string> = {
  CONNECTED: "bg-success/10 text-success border-success/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
  NOT_COMPLETED: "bg-coral/10 text-coral border-coral/20",
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  SCHEDULED_VISIT: "bg-primary/10 text-primary border-primary/20",
  NEEDS_FOLLOWUP: "bg-gold/10 text-gold border-gold/20",
};

const memberFormSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  address: z.string().optional(),
  memberSince: z.string().optional(),
  notes: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberFormSchemaBase>;

export default function LeaderMembers() {
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    CONNECTED: t('statusLabels.connected'),
    NO_RESPONSE: t('statusLabels.notConnected'),
  };

  const memberFormSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    address: z.string().optional(),
    memberSince: z.string().optional(),
    notes: z.string().optional(),
  });

  const { toast } = useToast();
  const basePath = useBasePath();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [scheduleFollowupDialogOpen, setScheduleFollowupDialogOpen] = useState(false);
  const [selectedMemberForSchedule, setSelectedMemberForSchedule] = useState<Member | null>(null);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/leader/members"],
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/leader/remove/member/${memberId}`);
    },
    onSuccess: async () => {
      toast({
        title: t('membersPage.memberRemoved'),
        description: t('membersPage.memberRemovedDesc'),
      });
      await queryClient.refetchQueries({ queryKey: ["/api/leader/members"] });
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const { data: tokens } = useQuery<{ publicToken: string | null; newMemberToken: string | null; memberToken: string | null }>({
    queryKey: ["/api/leader/church/tokens"],
  });

  const { data: church } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/leader/church"],
  });

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: undefined,
      gender: undefined,
      address: "",
      memberSince: "",
      notes: "",
    },
  });

  const handleViewDetails = (member: Member) => {
    setLocation(`${basePath}/members/${member.id}`);
  };

  const handleScheduleFollowUp = (member: Member) => {
    setSelectedMemberForSchedule(member);
    setScheduleFollowupDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      await apiRequest("POST", "/api/leader/members", data);
    },
    onSuccess: () => {
      toast({
        title: t('membersPage.memberAdded'),
        description: t('membersPage.memberAddedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/members"] });
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

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/leader/church/generate-member-token", {});
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('common.savedSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/church/tokens"] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const copyMemberLink = () => {
    if (tokens?.memberToken) {
      const link = `${window.location.origin}/member/${tokens.memberToken}`;
      navigator.clipboard.writeText(link);
      toast({
        title: t('common.success'),
        description: t('common.savedSuccessfully'),
      });
    }
  };

  const filteredMembers = members?.filter((m) => {
    const matchesSearch =
      !search ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search) ||
      m.email?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('membersPage.title')}
          description={t('membersPage.description')}
          actions={
            <div className="flex gap-2 flex-wrap">
            {tokens?.memberToken ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={copyMemberLink} data-testid="button-copy-member-link">
                    <Copy className="h-4 w-4" />
                    {t('membersPage.copyMemberLink')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('membersPage.copyMemberLinkTooltip')}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                data-testid="button-generate-member-link"
              >
                {generateTokenMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {t('membersPage.generateMemberLink')}
              </Button>
            )}
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-member">
                  <Plus className="h-4 w-4" />
                  {t('membersPage.addMember')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('membersPage.addMember')}</DialogTitle>
                  <DialogDescription>
                    {t('membersPage.description')}
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
                                data-testid="input-member-firstname"
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
                                data-testid="input-member-lastname"
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
                                data-testid="input-member-phone"
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
                                data-testid="input-member-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.gender')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-member-gender">
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

                    <div className="grid gap-4 sm:grid-cols-2">
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
                                data-testid="input-member-dob"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="memberSince"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('forms.memberSince')}</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value || ""}
                                onChange={field.onChange}
                                data-testid="input-member-since"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.country')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-member-country">
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
                              data-testid="input-member-address"
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
                              placeholder={t('forms.notes')}
                              value={field.value || ""}
                              onChange={field.onChange}
                              context="Notes about a member in a ministry"
                              data-testid="input-member-notes"
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
                      data-testid="button-submit-member"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t('forms.saving')}
                        </>
                      ) : (
                        t('membersPage.addMember')
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
                  data-testid="input-search-members"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredMembers?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('membersPage.noMembers')}</h3>
                <p className="text-muted-foreground">
                  {search ? t('common.tryDifferentSearch') : t('membersPage.addFirstMember')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.contact')}</TableHead>
                      <TableHead>{t('forms.gender')}</TableHead>
                      <TableHead>{t('forms.memberSince')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers?.map((m) => (
                      <TableRow key={m.id} data-testid={`row-member-${m.id}`}>
                        <TableCell>
                          <div 
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => handleViewDetails(m)}
                            data-testid={`link-view-details-${m.id}`}
                          >
                            {m.firstName} {m.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {m.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {m.phone}
                              </div>
                            )}
                            {m.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {m.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{m.gender || "-"}</TableCell>
                        <TableCell>
                          {m.memberSince ? format(new Date(m.memberSince), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {(m as any).lastFollowupOutcome ? (
                            <Badge className={statusColors[(m as any).lastFollowupOutcome] || "bg-muted text-muted-foreground"}>
                              {statusLabels[(m as any).lastFollowupOutcome] || (m as any).lastFollowupOutcome}
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground">
                              {t('forms.noStatus')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleScheduleFollowUp(m)}
                                  data-testid={`button-schedule-followup-${m.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('followUps.scheduleFollowUp')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleViewDetails(m)}
                                  data-testid={`button-view-member-${m.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.view')} {t('common.details')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    setMemberToRemove(m);
                                    setRemoveDialogOpen(true);
                                  }}
                                  data-testid={`button-remove-member-${m.id}`}
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

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.removeFromMinistry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.removeConfirm', { name: `${memberToRemove?.firstName} ${memberToRemove?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forms.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-member"
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

      {selectedMemberForSchedule && (
        <MemberScheduleFollowUpDialog
          open={scheduleFollowupDialogOpen}
          onOpenChange={setScheduleFollowupDialogOpen}
          memberId={selectedMemberForSchedule.id}
          memberFirstName={selectedMemberForSchedule.firstName}
          memberLastName={selectedMemberForSchedule.lastName}
          memberPhone={selectedMemberForSchedule.phone}
        />
      )}
    </DashboardLayout>
  );
}
