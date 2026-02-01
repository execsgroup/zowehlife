import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, Link, useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
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


const updateConvertSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
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

type UpdateConvertData = z.infer<typeof updateConvertSchema>;

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-3/10 text-chart-3 border-chart-3/20",
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
  const basePath = useBasePath();
  const [location] = useLocation();
  const convertId = location.split('/').pop();

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: convert, isLoading } = useQuery<ConvertWithCheckins>({
    queryKey: ["/api/leader/converts", convertId],
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
      await apiRequest("PATCH", `/api/leader/converts/${convertId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Convert updated",
        description: "The convert information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts", convertId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
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
            <Link href={`${basePath}/converts`}>
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
        <Link href={`${basePath}/converts`}>
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
                  Convert Date: {format(new Date(convert.createdAt), "MMMM d, yyyy")}
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
          <CardContent className="space-y-6">
            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <Separator />

            {/* Personal Details */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Personal Details</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {convert.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Date of Birth:</span>
                      {format(new Date(convert.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {convert.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Gender:</span>
                      {convert.gender}
                    </span>
                  </div>
                )}
                {convert.ageGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Age Group:</span>
                      {convert.ageGroup}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Faith Journey */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Faith Journey</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {convert.salvationDecision && (
                  <div className="flex items-start gap-2 md:col-span-2">
                    <Heart className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      <span className="text-muted-foreground mr-1">Decision:</span>
                      {convert.salvationDecision}
                    </span>
                  </div>
                )}
                {convert.isChurchMember !== null && convert.isChurchMember !== undefined && (
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Ministry Member:</span>
                      {convert.isChurchMember}
                    </span>
                  </div>
                )}
                {convert.wantsContact !== null && convert.wantsContact !== undefined && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Wants Contact:</span>
                      {convert.wantsContact}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Prayer Request */}
            {convert.prayerRequest && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Prayer Request</h4>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {convert.prayerRequest}
                  </p>
                </div>
              </>
            )}

            {/* Summary Notes */}
            {convert.summaryNotes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Notes
                  </h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {convert.summaryNotes}
                  </p>
                </div>
              </>
            )}

            {/* Self-submitted indicator */}
            {convert.selfSubmitted === "true" && (
              <>
                <Separator />
                <Badge variant="secondary" className="w-fit">
                  Self-submitted via public form
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Follow-up Timeline Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Follow-up Timeline</CardTitle>
                <CardDescription>
                  Record and track check-ins with this convert
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setNoteDialogOpen(true)}
                  data-testid="button-add-note"
                >
                  <FileText className="h-4 w-4" />
                  Add Note
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => setScheduleDialogOpen(true)}
                  data-testid="button-schedule-followup"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Schedule Follow Up
                </Button>
              </div>
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
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Next follow-up:{" "}
                              {format(new Date(checkin.nextFollowupDate), "MMM d, yyyy")}
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
                            {checkin.videoLink && (
                              <a
                                href={checkin.videoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-1"
                                  data-testid={`button-join-meeting-${checkin.id}`}
                                >
                                  <Video className="h-3 w-3" />
                                  Join Meeting
                                </Button>
                              </a>
                            )}
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
                <p className="text-muted-foreground mb-4">No follow-ups recorded yet</p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => setNoteDialogOpen(true)}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-add-first-note"
                  >
                    <FileText className="h-4 w-4" />
                    Add Note
                  </Button>
                  <Button
                    onClick={() => setScheduleDialogOpen(true)}
                    className="gap-2"
                    data-testid="button-schedule-first-followup"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Schedule Follow Up
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <FormField
                  control={editForm.control}
                  name="salvationDecision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salvation Decision</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-salvation">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="I just made Jesus Christ my Lord and Savior">I just made Jesus Christ my Lord and Savior</SelectItem>
                          <SelectItem value="I have rededicated my life to Jesus">I have rededicated my life to Jesus</SelectItem>
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

                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
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
                      <FormLabel>Email Address</FormLabel>
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
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-dob" />
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
                      <FormLabel>Country of Residence</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-country">
                            <SelectValue placeholder="Select country" />
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
                        <FormLabel>Would you like us to contact you?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-wants-contact">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
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
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-gender">
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-age-group">
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

                  <FormField
                    control={editForm.control}
                    name="isChurchMember"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Are you a member of any Ministry?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-church-member">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
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
                      <FormLabel>Prayer Request / Additional Information</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share any prayer requests or additional information..."
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
                      <FormLabel>Additional Notes (Leader Only)</FormLabel>
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

        <ConvertAddNoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          convert={convert}
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
