import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { useBasePath } from "@/hooks/use-base-path";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send, Mail, MessageSquare, Image, ArrowLeft, Clock, X, CalendarClock } from "lucide-react";
import { MmsImageUpload } from "@/components/mms-image-upload";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GroupCount {
  email: number;
  phone: number;
  total: number;
}

interface RecipientCounts {
  converts: GroupCount;
  new_members: GroupCount;
  members: GroupCount;
  guests: GroupCount;
}

interface SmsUsageData {
  billingPeriod: string;
  plan: string;
  smsUsed: number;
  mmsUsed: number;
  smsLimit: number;
  mmsLimit: number;
  smsRemaining: number;
  mmsRemaining: number;
}

interface ScheduledAnnouncement {
  id: string;
  subject: string;
  message: string;
  notificationMethod: string;
  recipientGroups: string[];
  scheduledAt: string;
  status: string;
  createdAt: string;
}

const announcementSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  notificationMethod: z.enum(["email", "sms", "mms"]).default("email"),
  smsMessage: z.string().optional(),
  mmsMediaUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  recipientGroups: z.array(z.string()).min(1, "Select at least one recipient group"),
}).refine(
  (data) => {
    if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
      return !!data.smsMessage?.trim();
    }
    return true;
  },
  { message: "SMS/MMS message text is required", path: ["smsMessage"] }
);

type AnnouncementForm = z.infer<typeof announcementSchema>;

const recipientGroupOptions = [
  { id: "converts", label: "Converts" },
  { id: "new_members", label: "New Members & Guests" },
  { id: "members", label: "Members" },
  { id: "guests", label: "Guests" },
];

const groupLabels: Record<string, string> = {
  converts: "Converts",
  new_members: "New Members",
  members: "Members",
  guests: "Guests",
};

const methodLabels: Record<string, string> = {
  email: "Email",
  sms: "Email + SMS",
  mms: "Email + MMS",
};

function formatScheduledDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AnnouncementsPage() {
  const apiBasePath = useApiBasePath();
  const basePath = useBasePath();
  const { toast } = useToast();
  const [emailImageUrl, setEmailImageUrl] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      subject: "",
      message: "",
      notificationMethod: "email",
      smsMessage: "",
      mmsMediaUrl: "",
      imageUrl: "",
      recipientGroups: [],
    },
  });

  const notificationMethod = form.watch("notificationMethod");
  const selectedGroups = form.watch("recipientGroups");

  const { data: recipientCounts, isLoading: countsLoading } = useQuery<RecipientCounts>({
    queryKey: [apiBasePath, "announcements", "recipient-counts"],
    queryFn: async () => {
      const res = await fetch(`${apiBasePath}/announcements/recipient-counts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch counts");
      return res.json();
    },
  });

  const { data: smsUsage } = useQuery<SmsUsageData>({
    queryKey: [apiBasePath, "sms-usage"],
    queryFn: async () => {
      const res = await fetch(`${apiBasePath}/sms-usage`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch SMS usage");
      return res.json();
    },
  });

  const { data: scheduledAnnouncements, isLoading: scheduledLoading } = useQuery<ScheduledAnnouncement[]>({
    queryKey: [apiBasePath, "announcements", "scheduled"],
    queryFn: async () => {
      const res = await fetch(`${apiBasePath}/announcements/scheduled`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scheduled announcements");
      return res.json();
    },
  });

  const isFree = smsUsage?.plan === "free";
  const smsAvailable = (smsUsage?.smsRemaining ?? 0) > 0;
  const mmsAvailable = (smsUsage?.mmsRemaining ?? 0) > 0;

  const totalSelectedEmailRecipients = selectedGroups.reduce((sum, group) => {
    const key = group as keyof RecipientCounts;
    return sum + (recipientCounts?.[key]?.email || 0);
  }, 0);

  const totalSelectedPhoneRecipients = selectedGroups.reduce((sum, group) => {
    const key = group as keyof RecipientCounts;
    return sum + (recipientCounts?.[key]?.phone || 0);
  }, 0);

  const sendMutation = useMutation({
    mutationFn: async (data: AnnouncementForm) => {
      const payload: any = {
        subject: data.subject,
        message: data.message,
        notificationMethod: data.notificationMethod,
        recipientGroups: data.recipientGroups,
      };
      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        payload.smsMessage = data.smsMessage;
      }
      if (data.notificationMethod === "mms" && data.mmsMediaUrl) {
        payload.mmsMediaUrl = data.mmsMediaUrl;
      }
      if (emailImageUrl) {
        payload.imageUrl = emailImageUrl;
      }

      if (isScheduled) {
        if (!scheduleDate || !scheduleTime) {
          throw new Error("Please select both a date and time for scheduling");
        }
        const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
        if (scheduledAt <= new Date()) {
          throw new Error("Scheduled time must be in the future");
        }
        payload.scheduledAt = scheduledAt.toISOString();
        const res = await apiRequest("POST", `${apiBasePath}/announcements/schedule`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", `${apiBasePath}/announcements/send`, payload);
        return res.json();
      }
    },
    onSuccess: (data) => {
      if (isScheduled) {
        toast({
          title: "Announcement Scheduled",
          description: `Your announcement has been scheduled for ${formatScheduledDate(`${scheduleDate}T${scheduleTime}`)}`,
        });
        queryClient.invalidateQueries({ queryKey: [apiBasePath, "announcements", "scheduled"] });
      } else {
        const smsLabel = notificationMethod === "mms" ? "MMS" : "SMS";
        let desc = `${data.emailsSent} email(s) sent`;
        if (data.smsSent > 0) desc += `, ${data.smsSent} ${smsLabel} sent`;
        if (data.emailsFailed > 0) desc += `. ${data.emailsFailed} email(s) failed`;
        if (data.smsFailed > 0) desc += `. ${data.smsFailed} ${smsLabel} failed`;
        if (data.smsSkipped > 0) desc += `. ${data.smsSkipped} ${smsLabel} skipped (plan limit reached)`;
        toast({
          title: "Announcement Sent",
          description: desc,
        });
      }
      form.reset();
      setEmailImageUrl("");
      setIsScheduled(false);
      setScheduleDate("");
      setScheduleTime("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed",
        description: error.message || "Could not process announcement",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `${apiBasePath}/announcements/scheduled/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cancelled", description: "Scheduled announcement has been cancelled" });
      queryClient.invalidateQueries({ queryKey: [apiBasePath, "announcements", "scheduled"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AnnouncementForm) => {
    sendMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`${basePath}/dashboard`}>
          <Button variant="ghost" size="icon" data-testid="button-back-announcements">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-announcements-title">Announcements</h1>
          <p className="text-muted-foreground mt-1">Send communications to your ministry members</p>
        </div>
      </div>

      {(scheduledLoading || (scheduledAnnouncements && scheduledAnnouncements.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Scheduled Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading scheduled announcements...
              </div>
            )}
            {scheduledAnnouncements?.map((sa) => (
              <div
                key={sa.id}
                className="flex items-start justify-between gap-3 p-3 rounded-md border"
                data-testid={`scheduled-announcement-${sa.id}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium truncate" data-testid={`text-scheduled-subject-${sa.id}`}>{sa.subject}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatScheduledDate(sa.scheduledAt)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {methodLabels[sa.notificationMethod] || sa.notificationMethod}
                    </Badge>
                    {sa.recipientGroups.map((g: string) => (
                      <Badge key={g} variant="outline" className="text-xs">
                        {groupLabels[g] || g}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => cancelMutation.mutate(sa.id)}
                  disabled={cancelMutation.isPending}
                  data-testid={`button-cancel-scheduled-${sa.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField
                control={form.control}
                name="recipientGroups"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-3">
                      {recipientGroupOptions.map((group) => (
                        <FormField
                          key={group.id}
                          control={form.control}
                          name="recipientGroups"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, group.id]
                                        : current.filter((v: string) => v !== group.id)
                                    );
                                  }}
                                  data-testid={`checkbox-group-${group.id}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex items-center gap-2 flex-wrap">
                                {group.label}
                                {recipientCounts && (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {recipientCounts[group.id as keyof RecipientCounts]?.email} email
                                    </Badge>
                                    {(notificationMethod === "sms" || notificationMethod === "mms") && (
                                      <Badge variant="secondary" className="text-xs">
                                        {recipientCounts[group.id as keyof RecipientCounts]?.phone} phone
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                    {selectedGroups.length > 0 && (
                      <div className="text-sm text-muted-foreground mt-2 space-y-1" data-testid="text-total-recipients">
                        <p>Email recipients: {totalSelectedEmailRecipients}</p>
                        {(notificationMethod === "sms" || notificationMethod === "mms") && (
                          <p>{notificationMethod === "mms" ? "MMS" : "SMS"} recipients (with phone): {totalSelectedPhoneRecipients}</p>
                        )}
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notificationMethod"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "email"}
                      data-testid="select-announcement-method"
                    >
                      <FormControl>
                        <SelectTrigger data-testid="trigger-announcement-method">
                          <SelectValue placeholder="Select notification method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email" data-testid="option-announcement-email">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Only
                          </span>
                        </SelectItem>
                        <SelectItem
                          value="sms"
                          disabled={isFree || !smsAvailable}
                          data-testid="option-announcement-sms"
                        >
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <MessageSquare className="h-4 w-4" />
                            Email + SMS
                            {isFree && <Badge variant="secondary" className="text-xs">Upgrade</Badge>}
                            {!isFree && !smsAvailable && <Badge variant="destructive" className="text-xs">Limit reached</Badge>}
                          </span>
                        </SelectItem>
                        <SelectItem
                          value="mms"
                          disabled={isFree || !mmsAvailable}
                          data-testid="option-announcement-mms"
                        >
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <Image className="h-4 w-4" />
                            Email + MMS
                            {isFree && <Badge variant="secondary" className="text-xs">Upgrade</Badge>}
                            {!isFree && !mmsAvailable && <Badge variant="destructive" className="text-xs">Limit reached</Badge>}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {smsUsage && !isFree && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" data-testid="text-announcement-sms-usage">
                  <span>SMS: {smsUsage.smsRemaining}/{smsUsage.smsLimit} remaining</span>
                  <span>MMS: {smsUsage.mmsRemaining}/{smsUsage.mmsLimit} remaining</span>
                </div>
              )}

              {isFree && (
                <p className="text-xs text-muted-foreground">
                  SMS/MMS messaging is available on paid plans.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email subject..."
                        {...field}
                        data-testid="input-announcement-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your announcement message..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="input-announcement-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Email Image (optional)</p>
                <p className="text-xs text-muted-foreground">Attach an image that will appear in the email body</p>
                <MmsImageUpload
                  onImageUploaded={(url) => setEmailImageUrl(url)}
                  onImageRemoved={() => setEmailImageUrl("")}
                  currentUrl={emailImageUrl || undefined}
                />
              </div>
            </CardContent>
          </Card>

          {(notificationMethod === "sms" || notificationMethod === "mms") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {notificationMethod === "mms" ? "MMS Message" : "SMS Message"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="smsMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{notificationMethod === "mms" ? "MMS Text" : "SMS Text"}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Write your ${notificationMethod === "mms" ? "MMS" : "SMS"} message...`}
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-announcement-sms-message"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        This text will be sent via {notificationMethod === "mms" ? "MMS" : "SMS"} to recipients with a phone number on file.
                      </p>
                    </FormItem>
                  )}
                />

                {notificationMethod === "mms" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">MMS Image Attachment (optional)</p>
                    <MmsImageUpload
                      onImageUploaded={(url) => form.setValue("mmsMediaUrl", url)}
                      onImageRemoved={() => form.setValue("mmsMediaUrl", "")}
                      currentUrl={form.watch("mmsMediaUrl") || undefined}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="schedule-toggle"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                  data-testid="switch-schedule-toggle"
                />
                <Label htmlFor="schedule-toggle" className="cursor-pointer">
                  Schedule for later
                </Label>
              </div>

              {isScheduled && (
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="schedule-date" className="text-sm">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      data-testid="input-schedule-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="schedule-time" className="text-sm">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      data-testid="input-schedule-time"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={sendMutation.isPending || selectedGroups.length === 0}
              data-testid="button-send-announcement"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isScheduled ? "Scheduling..." : "Sending..."}
                </>
              ) : isScheduled ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Announcement
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
