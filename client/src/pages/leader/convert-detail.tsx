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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
} from "lucide-react";
import { format } from "date-fns";

const checkinFormSchema = z.object({
  checkinDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
  nextFollowupDate: z.string().optional(),
});

const updateConvertSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  summaryNotes: z.string().optional(),
  status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]),
});

type CheckinFormData = z.infer<typeof checkinFormSchema>;
type UpdateConvertData = z.infer<typeof updateConvertSchema>;

const statusColors: Record<string, string> = {
  NEW: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-4/10 text-chart-4 border-chart-4/20",
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

interface ConvertWithCheckins extends Convert {
  checkins: Checkin[];
}

export default function ConvertDetail() {
  const { toast } = useToast();
  const [, params] = useRoute("/leader/converts/:id");
  const convertId = params?.id;

  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: convert, isLoading } = useQuery<ConvertWithCheckins>({
    queryKey: ["/api/leader/converts", convertId],
    enabled: !!convertId,
  });

  const checkinForm = useForm<CheckinFormData>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      checkinDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      outcome: "CONNECTED",
      nextFollowupDate: "",
    },
  });

  const editForm = useForm<UpdateConvertData>({
    resolver: zodResolver(updateConvertSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
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
        address: convert.address || "",
        summaryNotes: convert.summaryNotes || "",
        status: convert.status,
      });
    }
    setEditDialogOpen(true);
  };

  const checkinMutation = useMutation({
    mutationFn: async (data: CheckinFormData) => {
      await apiRequest("POST", `/api/leader/converts/${convertId}/checkins`, data);
    },
    onSuccess: () => {
      toast({
        title: "Check-in recorded",
        description: "The follow-up check-in has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts", convertId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/stats"] });
      setCheckinDialogOpen(false);
      checkinForm.reset({
        checkinDate: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        outcome: "CONNECTED",
        nextFollowupDate: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save check-in",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateConvertData) => {
      await apiRequest("PATCH", `/api/leader/converts/${convertId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Convert updated",
        description: "The convert information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts", convertId] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update convert",
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
PRODID:-//New Converts Tracker//EN
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
      <DashboardLayout title="Convert Details">
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
      <DashboardLayout title="Convert Not Found">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Convert not found</h3>
            <p className="text-muted-foreground mb-4">
              The convert you're looking for doesn't exist or you don't have access.
            </p>
            <Link href="/leader/converts">
              <Button>Back to Converts</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Convert Details">
      <div className="space-y-6">
        {/* Back button */}
        <Link href="/leader/converts">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Converts
          </Button>
        </Link>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {convert.firstName} {convert.lastName}
                </CardTitle>
                <CardDescription>
                  Added on {format(new Date(convert.createdAt), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[convert.status]}>
                  {convert.status.replace("_", " ")}
                </Badge>
                <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {convert.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${convert.phone}`} className="hover:text-foreground">
                    {convert.phone}
                  </a>
                </div>
              )}
              {convert.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${convert.email}`} className="hover:text-foreground">
                    {convert.email}
                  </a>
                </div>
              )}
              {convert.address && (
                <div className="flex items-center gap-2 text-muted-foreground md:col-span-2">
                  <MapPin className="h-4 w-4" />
                  {convert.address}
                </div>
              )}
            </div>

            {convert.summaryNotes && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {convert.summaryNotes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Check-ins Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Follow-up Timeline</CardTitle>
                <CardDescription>
                  Record and track check-ins with this convert
                </CardDescription>
              </div>
              <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-add-checkin">
                    <Plus className="h-4 w-4" />
                    Add Check-in
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Check-in</DialogTitle>
                    <DialogDescription>
                      Log a follow-up interaction with {convert.firstName}
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
                            <FormLabel>Check-in Date</FormLabel>
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

                      <FormField
                        control={checkinForm.control}
                        name="nextFollowupDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next Follow-up Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-next-followup" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCheckinDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={checkinMutation.isPending}
                          data-testid="button-save-checkin"
                        >
                          {checkinMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Check-in"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {convert.checkins && convert.checkins.length > 0 ? (
              <div className="space-y-4">
                {convert.checkins.map((checkin, index) => (
                  <div
                    key={checkin.id}
                    className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0"
                    data-testid={`checkin-${checkin.id}`}
                  >
                    <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {format(new Date(checkin.checkinDate), "MMMM d, yyyy")}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {outcomeLabels[checkin.outcome]}
                          </Badge>
                        </div>
                        {checkin.notes && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {checkin.notes}
                          </p>
                        )}
                        {checkin.nextFollowupDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Next follow-up:{" "}
                              {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 gap-1"
                              onClick={() => downloadICS(checkin)}
                              data-testid={`button-download-ics-${checkin.id}`}
                            >
                              <Download className="h-3 w-3" />
                              .ics
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
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">No check-ins recorded yet</p>
                <Button
                  onClick={() => setCheckinDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Check-in
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Convert</DialogTitle>
              <DialogDescription>
                Update information for {convert.firstName} {convert.lastName}
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
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-lastname" />
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
                          <Input type="tel" {...field} data-testid="input-edit-phone" />
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
                          <Input type="email" {...field} data-testid="input-edit-email" />
                        </FormControl>
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
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-address" />
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
                      <FormLabel>Notes</FormLabel>
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="CONNECTED">Connected</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
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
