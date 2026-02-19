import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Video } from "lucide-react";
import { AITextarea } from "@/components/ai-text-helper";
import { NotificationMethodSelector } from "@/components/notification-method-selector";
import { MmsImageUpload } from "@/components/mms-image-upload";

const scheduleFollowUpSchema = z.object({
  nextFollowupDate: z.string().min(1, "Follow-up date is required"),
  nextFollowupTime: z.string().optional(),
  customLeaderSubject: z.string().optional(),
  customLeaderMessage: z.string().optional(),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  smsMessage: z.string().optional(),
  mmsMediaUrl: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
  notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
});

type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchema>;

interface ConvertInfo {
  id: string | number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

interface ConvertScheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convert: ConvertInfo | null;
}

export function ConvertScheduleFollowUpDialog({
  open,
  onOpenChange,
  convert,
}: ConvertScheduleFollowUpDialogProps) {
  const { toast } = useToast();
  const apiBasePath = useApiBasePath();

  const form = useForm<ScheduleFollowUpData>({
    resolver: zodResolver(scheduleFollowUpSchema),
    defaultValues: {
      nextFollowupDate: "",
      nextFollowupTime: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      smsMessage: "",
      mmsMediaUrl: "",
      includeVideoLink: true,
      notificationMethod: "email",
    },
  });

  const notificationMethod = form.watch("notificationMethod");

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      if (!convert) return;
      await apiRequest("POST", `${apiBasePath}/converts/${convert.id}/schedule-followup`, data);
    },
    onSuccess: () => {
      const method = form.getValues("notificationMethod");
      toast({
        title: "Follow-up scheduled",
        description: `The follow-up has been scheduled and ${method === "email" ? "email" : `email and ${method?.toUpperCase()}`} notifications will be sent.`,
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`, convert?.id?.toString()] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [apiBasePath, "sms-usage"] });
      onOpenChange(false);
      form.reset({
        nextFollowupDate: "",
        nextFollowupTime: "",
        customLeaderSubject: "",
        customLeaderMessage: "",
        customConvertSubject: "",
        customConvertMessage: "",
        smsMessage: "",
        mmsMediaUrl: "",
        includeVideoLink: true,
        notificationMethod: "email",
      });
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
            {convert && (
              <>Schedule a follow-up with {convert.firstName} {convert.lastName}</>
            )}
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
                    <Input type="date" {...field} data-testid="input-schedule-followup-date" />
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
                    <Input type="time" {...field} data-testid="input-schedule-followup-time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <NotificationMethodSelector
              form={form}
              hasPhone={!!convert?.phone}
            />

            <FormField
              control={form.control}
              name="includeVideoLink"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-include-video-link"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Include video call link
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Add a free Jitsi Meet video call link to the notification
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Customize the email notifications (leave blank for defaults):
              </p>
                
                {convert?.email && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Email to {convert.firstName} {convert.lastName}</p>
                    <FormField
                      control={form.control}
                      name="customConvertSubject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Leave blank for default subject..."
                              {...field}
                              data-testid="input-convert-subject"
                            />
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
                          <FormLabel>Message Body</FormLabel>
                          <FormControl>
                            <AITextarea
                              value={field.value || ""}
                              onChange={(text) => form.setValue("customConvertMessage", text)}
                              placeholder="Leave blank for default message..."
                              context={`Writing an initial follow-up email to a new convert named ${convert?.firstName} ${convert?.lastName} from a church ministry.`}
                              aiPlaceholder="e.g., Write a warm welcome message..."
                              rows={4}
                              data-testid="input-convert-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
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
                          context={`Writing a short SMS follow-up message to ${convert?.firstName} ${convert?.lastName} from a church ministry. Keep it under 160 characters.`}
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleFollowUpMutation.isPending}
                data-testid="button-schedule-followup"
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
