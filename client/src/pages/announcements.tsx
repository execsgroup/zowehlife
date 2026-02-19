import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send, Mail, MessageSquare, Image } from "lucide-react";
import { MmsImageUpload } from "@/components/mms-image-upload";

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

export default function AnnouncementsPage() {
  const apiBasePath = useApiBasePath();
  const { toast } = useToast();
  const [emailImageUrl, setEmailImageUrl] = useState<string>("");

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
      const res = await apiRequest("POST", `${apiBasePath}/announcements/send`, payload);
      return res.json();
    },
    onSuccess: (data) => {
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
      form.reset();
      setEmailImageUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send",
        description: error.message || "Could not send announcement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AnnouncementForm) => {
    sendMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-announcements-title">Announcements</h1>
        <p className="text-muted-foreground mt-1">Send communications to your ministry members</p>
      </div>

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

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={sendMutation.isPending || selectedGroups.length === 0}
              data-testid="button-send-announcement"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Announcement
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
