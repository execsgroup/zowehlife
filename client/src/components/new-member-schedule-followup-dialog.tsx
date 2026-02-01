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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Video } from "lucide-react";
import { AITextarea } from "@/components/ai-text-helper";

export const scheduleFollowUpSchema = z.object({
  nextFollowupDate: z.string().min(1, "Follow-up date is required"),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  customReminderSubject: z.string().optional(),
  customReminderMessage: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
});

export type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchema>;

interface NewMemberScheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newMemberId: string;
  newMemberFirstName: string;
  newMemberLastName: string;
}

export function NewMemberScheduleFollowUpDialog({
  open,
  onOpenChange,
  newMemberId,
  newMemberFirstName,
  newMemberLastName,
}: NewMemberScheduleFollowUpDialogProps) {
  const { toast } = useToast();

  const form = useForm<ScheduleFollowUpData>({
    resolver: zodResolver(scheduleFollowUpSchema),
    defaultValues: {
      nextFollowupDate: "",
      customConvertSubject: "",
      customConvertMessage: "",
      customReminderSubject: "",
      customReminderMessage: "",
      includeVideoLink: true,
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
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
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
            Schedule a follow-up with {newMemberFirstName} {newMemberLastName}
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
              <h4 className="font-medium text-sm">Initial Email to New Member (Optional)</h4>
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
                        context={`Writing a reminder email to ${newMemberFirstName} ${newMemberLastName} about an upcoming follow-up meeting from a church ministry.`}
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
