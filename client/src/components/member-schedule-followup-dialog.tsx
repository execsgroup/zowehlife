import { useForm } from "react-hook-form";
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

const scheduleFollowUpSchema = z.object({
  nextFollowupDate: z.string().min(1, "Follow-up date is required"),
  nextFollowupTime: z.string().optional(),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  customReminderSubject: z.string().optional(),
  customReminderMessage: z.string().optional(),
  smsMessage: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
  notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
});

type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchema>;

interface MemberScheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberPhone?: string | null;
}

export function MemberScheduleFollowUpDialog({
  open,
  onOpenChange,
  memberId,
  memberFirstName,
  memberLastName,
  memberPhone,
}: MemberScheduleFollowUpDialogProps) {
  const { toast } = useToast();
  const apiBasePath = useApiBasePath();

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
      includeVideoLink: true,
      notificationMethod: "email",
    },
  });

  const notificationMethod = form.watch("notificationMethod");

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      await apiRequest("POST", `${apiBasePath}/members/${memberId}/schedule-followup`, data);
    },
    onSuccess: () => {
      const method = form.getValues("notificationMethod");
      const methodLabel = method === "email" ? "email" : `email and ${method?.toUpperCase()}`;
      toast({
        title: "Follow-up scheduled",
        description: `The follow-up has been scheduled and ${methodLabel} notifications sent.`,
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`, memberId] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members/${memberId}/checkins`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      queryClient.invalidateQueries({ queryKey: [apiBasePath, "sms-usage"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule follow-up",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Follow Up</DialogTitle>
          <DialogDescription>
            Schedule a follow-up with {memberFirstName} {memberLastName}
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
                  <FormLabel>Follow-up Date *</FormLabel>
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
                  <FormLabel>Follow-up Time (optional)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-testid="input-followup-time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <NotificationMethodSelector
              form={form}
              hasPhone={!!memberPhone}
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
                      Include Video Call Link
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Generate a Jitsi Meet link for video calls
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Initial Email to Member (Optional)</h4>
              <p className="text-xs text-muted-foreground">Sent immediately when scheduling the follow-up</p>
              
              <FormField
                control={form.control}
                name="customConvertSubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Custom subject for initial email" {...field} data-testid="input-initial-email-subject" />
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
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <AITextarea
                        value={field.value || ""}
                        onChange={(text) => form.setValue("customConvertMessage", text)}
                        placeholder="Custom message for initial email"
                        context={`Writing an initial follow-up email to a church member named ${memberFirstName} ${memberLastName}.`}
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

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Day-Before Reminder (Optional)</h4>
              <p className="text-xs text-muted-foreground">Sent one day before the scheduled follow-up</p>
              
              <FormField
                control={form.control}
                name="customReminderSubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Custom subject for reminder email" {...field} data-testid="input-reminder-email-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customReminderMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <AITextarea
                        value={field.value || ""}
                        onChange={(text) => form.setValue("customReminderMessage", text)}
                        placeholder="Custom message for reminder email"
                        context={`Writing a reminder email to ${memberFirstName} ${memberLastName} about an upcoming follow-up meeting from a church ministry.`}
                        aiPlaceholder="e.g., Write a friendly reminder..."
                        rows={4}
                        data-testid="input-reminder-email-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(notificationMethod === "sms" || notificationMethod === "mms") && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border-t pt-4">
                <p className="text-sm font-medium">Custom {notificationMethod.toUpperCase()} Message (optional)</p>
                <p className="text-xs text-muted-foreground">An additional {notificationMethod.toUpperCase()} will be sent alongside the email above</p>
                <FormField
                  control={form.control}
                  name="smsMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <AITextarea
                          value={field.value || ""}
                          onChange={(text) => form.setValue("smsMessage", text)}
                          placeholder="Leave blank for default SMS message..."
                          context={`Writing a short SMS follow-up message to ${memberFirstName} ${memberLastName} from a church ministry. Keep it under 160 characters.`}
                          aiPlaceholder="e.g., Write a brief follow-up text..."
                          rows={3}
                          data-testid="input-sms-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  Scheduling...
                </>
              ) : (
                "Schedule Follow Up"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
