import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type NewMember } from "@shared/schema";
import { Plus, Search, UserPlus, Phone, Mail, Loader2, CalendarPlus, Eye, ClipboardCheck, Clock, Church, Users2, Users, UserMinus, Video } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { NewMemberScheduleFollowUpDialog } from "@/components/new-member-schedule-followup-dialog";

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

const newMemberFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type NewMemberFormData = z.infer<typeof newMemberFormSchema>;

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  SCHEDULED: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  NO_RESPONSE: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  REFERRED: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  NOT_COMPLETED: "bg-destructive/10 text-destructive border-destructive/20",
  NEVER_CONTACTED: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  CONNECTED: "Connected",
  NO_RESPONSE: "No Response",
  NEEDS_PRAYER: "Needs Prayer",
  REFERRED: "Referred",
  NOT_COMPLETED: "Not Completed",
  NEVER_CONTACTED: "Never Contacted",
  ACTIVE: "Active",
  IN_PROGRESS: "In Progress",
  INACTIVE: "Inactive",
};

const followUpStageLabels: Record<string, string> = {
  NEW: "Not Started",
  CONTACT_NEW_MEMBER: "Needs Contact",
  SCHEDULED: "1st Scheduled",
  FIRST_COMPLETED: "1st Completed",
  INITIATE_SECOND: "Ready for 2nd",
  SECOND_SCHEDULED: "2nd Scheduled",
  SECOND_COMPLETED: "2nd Completed",
  INITIATE_FINAL: "Ready for Final",
  FINAL_SCHEDULED: "Final Scheduled",
  FINAL_COMPLETED: "Completed",
};

const followUpStageColors: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-muted",
  CONTACT_NEW_MEMBER: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  SCHEDULED: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  FIRST_COMPLETED: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  INITIATE_SECOND: "bg-accent/10 text-accent border-accent/20",
  SECOND_SCHEDULED: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  SECOND_COMPLETED: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  INITIATE_FINAL: "bg-accent/10 text-accent border-accent/20",
  FINAL_SCHEDULED: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  FINAL_COMPLETED: "bg-primary/10 text-primary border-primary/20",
};

const followUpNoteSchema = z.object({
  checkinDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
});

type FollowUpNoteData = z.infer<typeof followUpNoteSchema>;

export default function LeaderNewMembers() {
  const { toast } = useToast();
  const basePath = useBasePath();
  const [location, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpNoteDialogOpen, setFollowUpNoteDialogOpen] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState<NewMember | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [convertToMemberDialogOpen, setConvertToMemberDialogOpen] = useState(false);
  const [convertToGuestDialogOpen, setConvertToGuestDialogOpen] = useState(false);
  const [finalFollowUpPromptOpen, setFinalFollowUpPromptOpen] = useState(false);

  const { data: newMembers, isLoading } = useQuery<NewMember[]>({
    queryKey: ["/api/leader/new-members"],
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
      const response = await apiRequest("POST", `/api/leader/new-members/${selectedNewMember.id}/checkins`, data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Note added",
        description: "The follow-up note has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
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
        title: "Error",
        description: error.message || "Failed to add note",
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
      await apiRequest("POST", "/api/leader/new-members", data);
    },
    onSuccess: () => {
      toast({
        title: "New member added",
        description: "The new member has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add new member",
        variant: "destructive",
      });
    },
  });

  const convertToMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/leader/new-members/${id}/convert-to-member`);
    },
    onSuccess: () => {
      toast({
        title: "Moved to Members",
        description: "The person has been moved to the Members List.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/members"] });
      setConvertToMemberDialogOpen(false);
      setSelectedNewMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move to members",
        variant: "destructive",
      });
    },
  });

  const convertToGuestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/leader/new-members/${id}/convert-to-guest`);
    },
    onSuccess: () => {
      toast({
        title: "Moved to Guest List",
        description: "The person has been moved to the Guest List.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/guests"] });
      setConvertToGuestDialogOpen(false);
      setSelectedNewMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move to guest list",
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

  return (
    <DashboardLayout title="New Members">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">New Members</h2>
            <p className="text-muted-foreground">
              Manage and track new members of your ministry
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-new-member">
                  <Plus className="h-4 w-4" />
                  Add New Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                  <DialogDescription>
                    Record information about a new member
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First name"
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
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
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
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Phone number"
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Email address"
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
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-new-member-gender">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
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
                            <FormLabel>Age Group</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-new-member-age-group">
                                  <SelectValue placeholder="Select age group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Under 18">Under 18</SelectItem>
                                <SelectItem value="18-24">18-24</SelectItem>
                                <SelectItem value="25-34">25-34</SelectItem>
                                <SelectItem value="35 and Above">35 and Above</SelectItem>
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
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
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
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-new-member-country">
                                <SelectValue placeholder="Select country" />
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
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Full address"
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
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes..."
                              {...field}
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
                          Adding...
                        </>
                      ) : (
                        "Add New Member"
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-new-members"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
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
                <h3 className="mt-4 text-lg font-semibold">No new members found</h3>
                <p className="text-muted-foreground">
                  Add a new member or adjust your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Follow Up Status</TableHead>
                      <TableHead>Visit Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNewMembers?.map((nm) => (
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
                          <Badge className={followUpStageColors[nm.followUpStage || "NEW"]}>
                            {followUpStageLabels[nm.followUpStage || "NEW"]}
                          </Badge>
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
                                  onClick={() => handleScheduleFollowUp(nm)}
                                  data-testid={`button-schedule-followup-${nm.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Schedule Follow Up</TooltipContent>
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
                              <TooltipContent>Follow Up Note</TooltipContent>
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
                              <TooltipContent>Follow Up Timeline</TooltipContent>
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
                              <TooltipContent>Move to Members</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => handleConvertToGuest(nm)}
                                  data-testid={`button-move-to-guest-${nm.id}`}
                                >
                                  <Users2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Move to Guest List</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Convert to Member Confirmation Dialog */}
      <Dialog open={convertToMemberDialogOpen} onOpenChange={setConvertToMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Members List</DialogTitle>
            <DialogDescription>
              Are you sure you want to move {selectedNewMember?.firstName} {selectedNewMember?.lastName} to the Members List? This will remove them from the New Members list.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConvertToMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedNewMember && convertToMemberMutation.mutate(selectedNewMember.id)}
              disabled={convertToMemberMutation.isPending}
              data-testid="button-confirm-move-to-member"
            >
              {convertToMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Moving...
                </>
              ) : (
                "Move to Members"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Guest Confirmation Dialog */}
      <Dialog open={convertToGuestDialogOpen} onOpenChange={setConvertToGuestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Guest List</DialogTitle>
            <DialogDescription>
              Are you sure you want to move {selectedNewMember?.firstName} {selectedNewMember?.lastName} to the Guest List? This indicates they won't be becoming a member.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConvertToGuestDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedNewMember && convertToGuestMutation.mutate(selectedNewMember.id)}
              disabled={convertToGuestMutation.isPending}
              data-testid="button-confirm-move-to-guest"
            >
              {convertToGuestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Moving...
                </>
              ) : (
                "Move to Guest List"
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
            <DialogTitle>Final Follow-Up Completed</DialogTitle>
            <DialogDescription>
              Congratulations! You have completed all follow-ups with {selectedNewMember?.firstName} {selectedNewMember?.lastName}. 
              Would you like to move them to the Members List or Guest List?
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
              Move to Members List
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setFinalFollowUpPromptOpen(false);
                setConvertToGuestDialogOpen(true);
              }}
              data-testid="button-prompt-move-to-guests"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Move to Guest List
            </Button>
            <Button 
              variant="ghost"
              onClick={() => {
                setFinalFollowUpPromptOpen(false);
                setSelectedNewMember(null);
              }}
              data-testid="button-prompt-decide-later"
            >
              Decide Later
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
        />
      )}

      {/* Follow Up Note Dialog */}
      <Dialog open={followUpNoteDialogOpen} onOpenChange={setFollowUpNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow Up Note</DialogTitle>
            <DialogDescription>
              Record a follow-up note for {selectedNewMember?.firstName} {selectedNewMember?.lastName}
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
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-note-date" />
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
                    <FormLabel>Outcome *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-note-outcome">
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
                control={followUpNoteForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes about the follow-up..."
                        {...field}
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
                    Saving...
                  </>
                ) : (
                  "Save Note"
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
  const { data: checkins, isLoading } = useQuery({
    queryKey: ["/api/leader/new-members", newMember?.id, "checkins"],
    queryFn: async () => {
      if (!newMember) return [];
      const res = await fetch(`/api/leader/new-members/${newMember.id}/checkins`);
      if (!res.ok) throw new Error("Failed to fetch checkins");
      return res.json();
    },
    enabled: !!newMember && open,
  });

  const outcomeLabels: Record<string, string> = {
    CONNECTED: "Connected",
    NO_RESPONSE: "No Response",
    NEEDS_PRAYER: "Needs Prayer",
    SCHEDULED_VISIT: "Scheduled Visit",
    REFERRED: "Referred",
    OTHER: "Other",
    NOT_COMPLETED: "Not Completed",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Follow Up Timeline</DialogTitle>
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
            <p className="mt-4 text-muted-foreground">No follow-ups recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkins?.map((checkin: any) => (
              <Card key={checkin.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {format(new Date(checkin.checkinDate), "MMMM d, yyyy")}
                      </p>
                      <Badge variant="outline">{outcomeLabels[checkin.outcome]}</Badge>
                      {checkin.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{checkin.notes}</p>
                      )}
                      {checkin.nextFollowupDate && (
                        <p className="text-sm text-muted-foreground">
                          Next follow-up: {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
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
                          Join Meeting
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
