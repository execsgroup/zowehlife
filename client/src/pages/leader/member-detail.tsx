import { useState } from "react";
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
import { type Member } from "@shared/schema";
import { MemberScheduleFollowUpDialog } from "@/components/member-schedule-followup-dialog";
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
}

const outcomeLabels: Record<string, string> = {
  CONNECTED: "Connected",
  NO_RESPONSE: "No Response",
  NEEDS_PRAYER: "Needs Prayer",
  SCHEDULED_VISIT: "Scheduled Visit",
  REFERRED: "Referred",
  NOT_COMPLETED: "Not Completed",
  OTHER: "Other",
};

const checkinFormSchema = z.object({
  checkinDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
});

const updateMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
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

type UpdateMemberData = z.infer<typeof updateMemberSchema>;
type CheckinFormData = z.infer<typeof checkinFormSchema>;

export default function MemberDetail() {
  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = useApiBasePath();
  const [location] = useLocation();
  const memberId = location.split('/').pop();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);

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
        title: "Member updated",
        description: "The member information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`, memberId] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive",
      });
    },
  });

  const checkinForm = useForm<CheckinFormData>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      checkinDate: new Date().toISOString().split("T")[0],
      notes: "",
      outcome: "CONNECTED",
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (data: CheckinFormData) => {
      await apiRequest("POST", `${apiBasePath}/members/${memberId}/checkins`, {
        checkinDate: data.checkinDate,
        outcome: data.outcome,
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "Follow-up note has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members/${memberId}/checkins`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`, memberId] });
      setCheckinDialogOpen(false);
      checkinForm.reset({
        checkinDate: new Date().toISOString().split("T")[0],
        notes: "",
        outcome: "CONNECTED",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
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
            <h3 className="text-sm font-semibold mb-2">Member not found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The member you're looking for doesn't exist or you don't have access.
            </p>
            <Link href={`${basePath}/members`}>
              <Button>Back to Members</Button>
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
            Back to Members
          </Button>
        </Link>

        <PageHeader
          title={`${member.firstName} ${member.lastName}`}
          description={`Added: ${format(new Date(member.createdAt), "MMMM d, yyyy")}`}
          actions={
            <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1">
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          }
        />

        <Section title="Contact Information">
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

        <Section title="Personal Details">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {member.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">Date of Birth:</span>
                  {format(new Date(member.dateOfBirth), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {member.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">Gender:</span>
                  {member.gender}
                </span>
              </div>
            )}
            {member.ageGroup && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">Age Group:</span>
                  {member.ageGroup}
                </span>
              </div>
            )}
            {member.memberSince && (
              <div className="flex items-center gap-2">
                <Church className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="text-xs text-muted-foreground mr-1">Member Since:</span>
                  {format(new Date(member.memberSince), "MMMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
          {member.selfSubmitted === "true" && (
            <div className="mt-3">
              <Badge variant="secondary" className="w-fit">
                Self-submitted via public form
              </Badge>
            </div>
          )}
        </Section>

        {member.notes && (
          <Section title="Notes">
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
              {member.notes}
            </p>
          </Section>
        )}

        <Section
          title="Follow-up Timeline"
          description="Record and track follow-ups with this member"
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setScheduleDialogOpen(true)}
              data-testid="button-schedule-followup"
            >
              <Calendar className="h-4 w-4" />
              Schedule Follow-up
            </Button>
          }
        >
            {checkins && checkins.length > 0 ? (
              <div className="space-y-4">
                {checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0"
                    data-testid={`checkin-${checkin.id}`}
                  >
                    <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium">
                            {format(new Date(checkin.checkinDate), "MMMM d, yyyy")}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {outcomeLabels[checkin.outcome] || checkin.outcome}
                          </Badge>
                        </div>
                        {checkin.notes && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {checkin.notes}
                          </p>
                        )}
                        {checkin.nextFollowupDate && (
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Next follow-up:{" "}
                              {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
                              {checkin.nextFollowupTime && (() => { const [h, m] = checkin.nextFollowupTime!.split(':').map(Number); return ` at ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
                            </span>
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
                                  Join Meeting
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setCheckinDialogOpen(true)}
                              data-testid={`button-add-note-${checkin.id}`}
                            >
                              <Plus className="h-4 w-4" />
                              Add Note
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
                <p className="text-muted-foreground">No follow-up notes yet</p>
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

        <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Follow-up Note</DialogTitle>
              <DialogDescription>
                Log a follow-up interaction with {member.firstName}
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
                        <AITextarea
                          placeholder="Details about the interaction..."
                          value={field.value || ""}
                          onChange={field.onChange}
                          context="Follow-up note for a member in a ministry"
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

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update the member's information
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                    control={editForm.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                  control={editForm.control}
                  name="memberSince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member Since</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Notes</FormLabel>
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
                      Updating...
                    </>
                  ) : (
                    "Update Member"
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
