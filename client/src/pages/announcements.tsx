import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { useBasePath } from "@/hooks/use-base-path";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send, Mail, MessageSquare, Image, ArrowLeft, Clock, X, CalendarClock } from "lucide-react";
import { MmsImageUpload } from "@/components/mms-image-upload";
import { AITextarea } from "@/components/ai-text-helper";
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

const announcementSchemaBase = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
  notificationMethod: z.enum(["email", "sms", "mms"]).default("email"),
  smsMessage: z.string().optional(),
  mmsMediaUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  recipientGroups: z.array(z.string()).min(1),
});

type AnnouncementForm = z.infer<typeof announcementSchemaBase>;

const recipientGroupOptionKeys: Array<{ id: string; labelKey: string }> = [
  { id: "converts", labelKey: "sidebar.converts" },
  { id: "new_members", labelKey: "newMembers.title" },
  { id: "members", labelKey: "membersPage.title" },
];

const groupLabelKeys: Record<string, string> = {
  converts: "sidebar.converts",
  new_members: "newMembers.title",
  members: "membersPage.title",
};

const methodLabelKeys: Record<string, string> = {
  email: "followUps.emailOnly",
  sms: "followUps.emailSms",
  mms: "followUps.emailMms",
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
  const { t } = useTranslation();
  const apiBasePath = useApiBasePath();
  const basePath = useBasePath();
  const { toast } = useToast();
  const [emailImageUrl, setEmailImageUrl] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const announcementSchema = z.object({
    subject: z.string().min(1, t('validation.subjectRequired')),
    message: z.string().min(1, t('validation.messageRequired')),
    notificationMethod: z.enum(["email", "sms", "mms"]).default("email"),
    smsMessage: z.string().optional(),
    mmsMediaUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    recipientGroups: z.array(z.string()).min(1, t('validation.selectRecipientGroup')),
  }).refine(
    (data) => {
      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        return !!data.smsMessage?.trim();
      }
      return true;
    },
    { message: t('validation.smsMessageRequired'), path: ["smsMessage"] }
  );

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
          title: t('announcements.announcementScheduled'),
          description: t('announcements.announcementScheduledDesc', { date: formatScheduledDate(`${scheduleDate}T${scheduleTime}`) }),
        });
        queryClient.invalidateQueries({ queryKey: [apiBasePath, "announcements", "scheduled"] });
      } else {
        const smsLabel = notificationMethod === "mms" ? "MMS" : "SMS";
        let desc = t('announcements.emailsSentCount', { count: data.emailsSent });
        if (data.smsSent > 0) desc += `, ${t('announcements.smsSentCount', { count: data.smsSent, method: smsLabel })}`;
        if (data.emailsFailed > 0) desc += `. ${t('announcements.emailsFailedCount', { count: data.emailsFailed })}`;
        if (data.smsFailed > 0) desc += `. ${t('announcements.smsFailedCount', { count: data.smsFailed, method: smsLabel })}`;
        if (data.smsSkipped > 0) desc += `. ${t('announcements.smsSkippedCount', { count: data.smsSkipped, method: smsLabel })}`;
        toast({
          title: t('announcements.announcementSent'),
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
        title: t('announcements.failed'),
        description: error.message || t('announcements.couldNotProcess'),
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
      toast({ title: t('announcements.cancelled'), description: t('announcements.scheduledCancelled') });
      queryClient.invalidateQueries({ queryKey: [apiBasePath, "announcements", "scheduled"] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
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
        <PageHeader
          title={t('announcements.title')}
          description={t('announcements.description')}
        />
      </div>

      {(scheduledLoading || (scheduledAnnouncements && scheduledAnnouncements.length > 0)) && (
        <Section title={t('announcements.scheduledAnnouncements')}>
          {scheduledLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('announcements.loadingScheduled')}
            </div>
          )}
          <div className="space-y-3">
            {scheduledAnnouncements?.map((sa) => (
              <div
                key={sa.id}
                className="flex items-start justify-between gap-3 p-3 rounded-md border"
                data-testid={`scheduled-announcement-${sa.id}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate" data-testid={`text-scheduled-subject-${sa.id}`}>{sa.subject}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatScheduledDate(sa.scheduledAt)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t(methodLabelKeys[sa.notificationMethod] || sa.notificationMethod)}
                    </Badge>
                    {sa.recipientGroups.map((g: string) => (
                      <Badge key={g} variant="outline" className="text-xs">
                        {t(groupLabelKeys[g] || g)}
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
          </div>
        </Section>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Section title={t('announcements.recipients')}>
            <FormField
              control={form.control}
              name="recipientGroups"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-2 gap-3">
                    {recipientGroupOptionKeys.map((group) => (
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
                              {t(group.labelKey)}
                              {recipientCounts && (
                                <>
                                  <Badge variant="secondary" className="text-xs">
                                    {recipientCounts[group.id as keyof RecipientCounts]?.email} {t('announcements.emailBadge')}
                                  </Badge>
                                  {(notificationMethod === "sms" || notificationMethod === "mms") && (
                                    <Badge variant="secondary" className="text-xs">
                                      {recipientCounts[group.id as keyof RecipientCounts]?.phone} {t('announcements.phoneBadge')}
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
                    <div className="text-xs text-muted-foreground mt-2 space-y-1" data-testid="text-total-recipients">
                      <p>{t('announcements.emailRecipients')}: {totalSelectedEmailRecipients}</p>
                      {(notificationMethod === "sms" || notificationMethod === "mms") && (
                        <p>{t('announcements.smsRecipientsWith', { method: notificationMethod === "mms" ? "MMS" : "SMS" })}: {totalSelectedPhoneRecipients}</p>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />
          </Section>

          <Section title={t('announcements.notificationMethod')}>
            <div className="space-y-4">
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
                          <SelectValue placeholder={t('announcements.selectNotificationMethod')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email" data-testid="option-announcement-email">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {t('followUps.emailOnly')}
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
                            {t('followUps.emailSms')}
                            {isFree && <Badge variant="secondary" className="text-xs">{t('announcements.upgrade')}</Badge>}
                            {!isFree && !smsAvailable && <Badge variant="destructive" className="text-xs">{t('announcements.limitReached')}</Badge>}
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
                            {t('followUps.emailMms')}
                            {isFree && <Badge variant="secondary" className="text-xs">{t('announcements.upgrade')}</Badge>}
                            {!isFree && !mmsAvailable && <Badge variant="destructive" className="text-xs">{t('announcements.limitReached')}</Badge>}
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
                  <span>SMS: {smsUsage.smsRemaining}/{smsUsage.smsLimit} {t('announcements.remaining')}</span>
                  <span>MMS: {smsUsage.mmsRemaining}/{smsUsage.mmsLimit} {t('announcements.remaining')}</span>
                </div>
              )}

              {isFree && (
                <p className="text-xs text-muted-foreground">
                  {t('announcements.smsPaidOnly')}
                </p>
              )}
            </div>
          </Section>

          <Section title={t('announcements.emailContent')}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('announcements.subject')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('announcements.enterSubject')}
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
                    <FormLabel>{t('announcements.message')}</FormLabel>
                    <FormControl>
                      <AITextarea
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t('announcements.writeMessage')}
                        rows={6}
                        context="Ministry announcement email to church members, converts, and guests. Keep the tone warm, encouraging, and faith-based."
                        aiPlaceholder="e.g., Write an encouraging announcement about..."
                        data-testid="input-announcement-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">{t('announcements.emailImage')}</p>
                <p className="text-xs text-muted-foreground">{t('announcements.emailImageDesc')}</p>
                <MmsImageUpload
                  onImageUploaded={(url) => setEmailImageUrl(url)}
                  onImageRemoved={() => setEmailImageUrl("")}
                  currentUrl={emailImageUrl || undefined}
                />
              </div>
            </div>
          </Section>

          {(notificationMethod === "sms" || notificationMethod === "mms") && (
            <Section title={notificationMethod === "mms" ? t('announcements.mmsMessage') : t('announcements.smsMessage')}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="smsMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{notificationMethod === "mms" ? t('announcements.mmsText') : t('announcements.smsText')}</FormLabel>
                      <FormControl>
                        <AITextarea
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={t('announcements.writeSmsMessage', { method: notificationMethod === "mms" ? "MMS" : "SMS" })}
                          rows={4}
                          context={`Short ${notificationMethod === "mms" ? "MMS" : "SMS"} text message for ministry members. Keep it brief, warm, and faith-based. SMS messages should be concise (under 160 characters ideally).`}
                          aiPlaceholder={t('announcements.writeBriefSms', { method: notificationMethod === "mms" ? "MMS" : "SMS" })}
                          data-testid="input-announcement-sms-message"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {t('announcements.smsSentVia', { method: notificationMethod === "mms" ? "MMS" : "SMS" })}
                      </p>
                    </FormItem>
                  )}
                />

                {notificationMethod === "mms" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t('announcements.mmsImageAttachment')}</p>
                    <MmsImageUpload
                      onImageUploaded={(url) => form.setValue("mmsMediaUrl", url)}
                      onImageRemoved={() => form.setValue("mmsMediaUrl", "")}
                      currentUrl={form.watch("mmsMediaUrl") || undefined}
                    />
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title={t('announcements.delivery')}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="schedule-toggle"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                  data-testid="switch-schedule-toggle"
                />
                <Label htmlFor="schedule-toggle" className="cursor-pointer">
                  {t('announcements.scheduleForLater')}
                </Label>
              </div>

              {isScheduled && (
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('forms.date')}</Label>
                    <DatePicker
                      value={scheduleDate}
                      onChange={setScheduleDate}
                      minDate={new Date()}
                      data-testid="input-schedule-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('forms.time')}</Label>
                    <TimePicker
                      value={scheduleTime}
                      onChange={setScheduleTime}
                      data-testid="input-schedule-time"
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={sendMutation.isPending || selectedGroups.length === 0}
              data-testid="button-send-announcement"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isScheduled ? t('announcements.scheduling') : t('announcements.sending')}
                </>
              ) : isScheduled ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  {t('announcements.scheduleAnnouncement')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('announcements.sendNow')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
