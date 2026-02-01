import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, Link } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type NewMember } from "@shared/schema";
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
} from "lucide-react";
import { format } from "date-fns";

interface NewMemberCheckin {
  id: string;
  checkinDate: string;
  notes: string | null;
  outcome: string;
  nextFollowupDate: string | null;
  videoLink: string | null;
  createdAt: string;
}

interface NewMemberWithCheckins extends NewMember {
  checkins: NewMemberCheckin[];
}

const updateNewMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female", ""]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]),
});

const scheduleFollowUpSchema = z.object({
  nextFollowupDate: z.string().min(1, "Follow-up date is required"),
  notes: z.string().optional(),
  customLeaderSubject: z.string().optional(),
  customLeaderMessage: z.string().optional(),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
});

const checkinFormSchema = z.object({
  checkinDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
});

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "United States", "United Kingdom", "Canada", "Nigeria", "Ghana", "Kenya", "South Africa", "Zimbabwe"
];

type UpdateNewMemberData = z.infer<typeof updateNewMemberSchema>;
type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchema>;
type CheckinFormData = z.infer<typeof checkinFormSchema>;

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  SCHEDULED: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  NO_RESPONSE: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

const outcomeLabels: Record<string, string> = {
  CONNECTED: "Connected",
  NO_RESPONSE: "No Response",
  NEEDS_PRAYER: "Needs Prayer",
  SCHEDULED_VISIT: "Scheduled Visit",
  REFERRED: "Referred",
  OTHER: "Other",
};

export default function NewMemberDetail() {
  const { toast } = useToast();
  const [, params] = useRoute("/leader/new-members/:id");
  const newMemberId = params?.id;

  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const { data: newMember, isLoading } = useQuery<NewMemberWithCheckins>({
    queryKey: ["/api/leader/new-members", newMemberId],
    enabled: !!newMemberId,
  });

  const checkinForm = useForm<CheckinFormData>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      checkinDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      outcome: "CONNECTED",
    },
  });

  const scheduleForm = useForm<ScheduleFollowUpData>({
    resolver: zodResolver(scheduleFollowUpSchema),
    defaultValues: {
      nextFollowupDate: "",
      notes: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      includeVideoLink: true,
    },
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

  const checkinMutation = useMutation({
    mutationFn: async (data: CheckinFormData) => {
      await apiRequest("POST", `/api/leader/new-members/${newMemberId}/checkins`, data);
    },
    onSuccess: () => {
      toast({
        title: "Check-in recorded",
        description: "The follow-up note has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members", newMemberId] });
      setCheckinDialogOpen(false);
      checkinForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save check-in",
        variant: "destructive",
      });
    },
  });

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      await apiRequest("POST", `/api/leader/new-members/${newMemberId}/schedule-followup`, data);
    },
    onSuccess: () => {
      toast({
        title: "Follow-up scheduled",
        description: "The follow-up has been scheduled and notifications sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members", newMemberId] });
      setScheduleDialogOpen(false);
      scheduleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule follow-up",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateNewMemberData) => {
      await apiRequest("PATCH", `/api/leader/new-members/${newMemberId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "New member updated",
        description: "The new member information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members", newMemberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update new member",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="New Member Details">
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
      <DashboardLayout title="New Member Not Found">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">New member not found</h3>
            <p className="text-muted-foreground mb-4">
              The new member you're looking for doesn't exist or you don't have access.
            </p>
            <Link href="/leader/new-members">
              <Button>Back to New Members</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="New Member Details">
      <div className="space-y-6">
        <Link href="/leader/new-members">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to New Members
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {newMember.firstName} {newMember.lastName}
                </CardTitle>
                <CardDescription>
                  Joined: {format(new Date(newMember.createdAt), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[newMember.status]}>
                  {newMember.status.replace("_", " ")}
                </Badge>
                <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Personal Details</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {newMember.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Date of Birth:</span>
                      {format(new Date(newMember.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {newMember.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Gender:</span>
                      {newMember.gender}
                    </span>
                  </div>
                )}
                {newMember.ageGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Age Group:</span>
                      {newMember.ageGroup}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {newMember.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Notes</h4>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {newMember.notes}
                  </p>
                </div>
              </>
            )}

            {newMember.selfSubmitted === "true" && (
              <>
                <Separator />
                <Badge variant="secondary" className="w-fit">
                  Self-submitted via public form
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Follow-up Timeline</CardTitle>
                <CardDescription>
                  Record and track follow-ups with this new member
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="button-schedule-followup">
                      <Calendar className="h-4 w-4" />
                      Schedule Follow-up
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Schedule Follow-up</DialogTitle>
                      <DialogDescription>
                        Schedule a follow-up with {newMember.firstName}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...scheduleForm}>
                      <form
                        onSubmit={scheduleForm.handleSubmit((data) => scheduleFollowUpMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={scheduleForm.control}
                          name="nextFollowupDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Follow-up Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-schedule-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={scheduleForm.control}
                          name="includeVideoLink"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Include video call link</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={scheduleForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Notes for this follow-up..."
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={scheduleFollowUpMutation.isPending}
                        >
                          {scheduleFollowUpMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Scheduling...
                            </>
                          ) : (
                            "Schedule Follow-up"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-checkin">
                      <Plus className="h-4 w-4" />
                      Add Note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Follow-up Note</DialogTitle>
                      <DialogDescription>
                        Log a follow-up interaction with {newMember.firstName}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...checkinForm}>
                      <form
                        onSubmit={checkinForm.handleSubmit((data) => checkinMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={checkinForm.control}
                          name="checkinDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-checkin-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={checkinForm.control}
                          name="outcome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Outcome</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-checkin-outcome">
                                    <SelectValue />
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
                          control={checkinForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Details about the interaction..."
                                  className="resize-none"
                                  {...field}
                                  data-testid="input-checkin-notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={checkinMutation.isPending}
                        >
                          {checkinMutation.isPending ? (
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {newMember.checkins && newMember.checkins.length > 0 ? (
              <div className="space-y-4">
                {newMember.checkins.map((checkin) => (
                  <div key={checkin.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(checkin.checkinDate), "MMMM d, yyyy")}
                      <Badge variant="outline" className="ml-2">
                        {outcomeLabels[checkin.outcome] || checkin.outcome}
                      </Badge>
                    </div>
                    {checkin.notes && <p className="text-sm">{checkin.notes}</p>}
                    {checkin.nextFollowupDate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Next follow-up: {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
                      </p>
                    )}
                    {checkin.videoLink && (
                      <a
                        href={checkin.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                      >
                        <Video className="h-3 w-3" />
                        Join Meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No follow-up notes yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit New Member</DialogTitle>
              <DialogDescription>
                Update the new member's information
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
                        <FormLabel>First Name *</FormLabel>
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
                        <FormLabel>Last Name *</FormLabel>
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
                        <FormLabel>Phone</FormLabel>
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
                        <FormLabel>Email</FormLabel>
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="CONNECTED">Connected</SelectItem>
                          <SelectItem value="NO_RESPONSE">No Response</SelectItem>
                          <SelectItem value="NEEDS_PRAYER">Needs Prayer</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
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
                      Updating...
                    </>
                  ) : (
                    "Update New Member"
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
