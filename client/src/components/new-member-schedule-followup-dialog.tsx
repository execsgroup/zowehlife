import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Video } from "lucide-react";
import { AITextarea } from "@/components/ai-text-helper";
import { NotificationMethodSelector } from "@/components/notification-method-selector";
import { MmsImageUpload } from "@/components/mms-image-upload";

export type ScheduleFollowUpData = z.infer<ReturnType<typeof createScheduleFollowUpSchema>>;

function createScheduleFollowUpSchema(t: (key: string) => string) {
  return z.object({
    nextFollowupDate: z.string().min(1, t('validation.followUpDateRequired')),
    nextFollowupTime: z.string().optional(),
    customConvertSubject: z.string().optional(),
    customConvertMessage: z.string().optional(),
    customReminderSubject: z.string().optional(),
    customReminderMessage: z.string().optional(),
    smsMessage: z.string().optional(),
    mmsMediaUrl: z.string().optional(),
    includeVideoLink: z.boolean().optional(),
    notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
  });
}

interface NewMemberScheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newMemberId: string;
  newMemberFirstName: string;
  newMemberLastName: string;
  newMemberPhone?: string | null;
}

export function NewMemberScheduleFollowUpDialog({
  open,
  onOpenChange,
  newMemberId,
  newMemberFirstName,
  newMemberLastName,
  newMemberPhone,
}: NewMemberScheduleFollowUpDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const apiBasePath = useApiBasePath();

  const scheduleFollowUpSchema = createScheduleFollowUpSchema(t);

  const form = useForm<ScheduleFollowUpData>({
    resolver: zodResolver(scheduleFollowUpSchema),
    defaultValues: {
      nextFollowupDate: "",
      nextFollowupTime: "",
      customConvertSubject: "",
      customConvertMessage: "",
      customReminderSubject: "",
      customReminderMessage: "",
      smsMessage: "",
      mmsMediaUrl: "",
      includeVideoLink: true,
      notificationMethod: "email",
    },
  });

  const notificationMethod = form.watch("notificationMethod");

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      await apiRequest("POST", `${apiBasePath}/new-members/${newMemberId}/schedule-followup`, data);
    },
    onSuccess: () => {
      const method = form.getValues("notificationMethod");
      const methodLabel = method === "email" ? "email" : `email and ${method?.toUpperCase()}`;
      toast({
        title: t('followUps.followUpScheduled'),
        description: t('followUps.followUpScheduledNotification', { method: methodLabel }),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`, newMemberId] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [apiBasePath, "sms-usage"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('followUps.failedToScheduleFollowUp'),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('followUps.scheduleFollowUp')}</DialogTitle>
          <DialogDescription>
            {t('followUps.scheduleFollowUpWith', { name: `${newMemberFirstName} ${newMemberLastName}` })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => scheduleFollowUpMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nextFollowupDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('followUps.followUpDate')} *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split("T")[0]}
                      data-testid="input-followup-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextFollowupTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('followUps.followUpTimeOptional')}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-testid="input-followup-time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <NotificationMethodSelector
              form={form}
              hasPhone={!!newMemberPhone}
            />

            <FormField
              control={form.control}
              name="includeVideoLink"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-include-video"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      {t('followUps.includeVideoCallLink')}
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {t('followUps.videoCallDescription')}
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t('followUps.initialEmailToNewMember')}</h4>
              <p className="text-xs text-muted-foreground">{t('followUps.sentImmediately')}</p>
              
              <FormField
                control={form.control}
                name="customConvertSubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('followUps.subjectLine')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('followUps.defaultSubjectPlaceholder')} {...field} data-testid="input-initial-email-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customConvertMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('followUps.messageBody')}</FormLabel>
                    <FormControl>
                      <AITextarea
                        value={field.value || ""}
                        onChange={(text) => form.setValue("customConvertMessage", text)}
                        placeholder={t('followUps.defaultMessagePlaceholder')}
                        context={`Writing an initial follow-up email to a new church member named ${newMemberFirstName} ${newMemberLastName}.`}
                        aiPlaceholder="e.g., Write a warm welcome message..."
                        rows={4}
                        data-testid="input-initial-email-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(notificationMethod === "sms" || notificationMethod === "mms") && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border-t pt-4">
                <p className="text-sm font-medium">{t('followUps.customMethodMessage', { method: notificationMethod.toUpperCase() })}</p>
                <p className="text-xs text-muted-foreground">{t('followUps.additionalMethodSent', { method: notificationMethod.toUpperCase() })}</p>
                <FormField
                  control={form.control}
                  name="smsMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <AITextarea
                          value={field.value || ""}
                          onChange={(text) => form.setValue("smsMessage", text)}
                          placeholder={t('followUps.defaultSmsPlaceholder')}
                          context={`Writing a short SMS follow-up message to ${newMemberFirstName} ${newMemberLastName} from a church ministry. Keep it under 160 characters.`}
                          aiPlaceholder="e.g., Write a brief follow-up text..."
                          rows={3}
                          data-testid="input-sms-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {notificationMethod === "mms" && (
                  <MmsImageUpload
                    onImageUploaded={(url) => form.setValue("mmsMediaUrl", url)}
                    onImageRemoved={() => form.setValue("mmsMediaUrl", "")}
                    currentUrl={form.watch("mmsMediaUrl") || undefined}
                  />
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={scheduleFollowUpMutation.isPending}
              data-testid="button-confirm-schedule"
            >
              {scheduleFollowUpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('followUps.scheduling')}
                </>
              ) : (
                t('followUps.scheduleFollowUp')
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
