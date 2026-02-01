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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Video } from "lucide-react";
import { AITextarea } from "@/components/ai-text-helper";

const scheduleFollowUpSchema = z.object({
  nextFollowupDate: z.string().min(1, "Follow-up date is required"),
  customLeaderSubject: z.string().optional(),
  customLeaderMessage: z.string().optional(),
  customConvertSubject: z.string().optional(),
  customConvertMessage: z.string().optional(),
  includeVideoLink: z.boolean().optional(),
});

type ScheduleFollowUpData = z.infer<typeof scheduleFollowUpSchema>;

interface ConvertInfo {
  id: string | number;
  firstName: string;
  lastName: string;
  email?: string | null;
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

  const form = useForm<ScheduleFollowUpData>({
    resolver: zodResolver(scheduleFollowUpSchema),
    defaultValues: {
      nextFollowupDate: "",
      customLeaderSubject: "",
      customLeaderMessage: "",
      customConvertSubject: "",
      customConvertMessage: "",
      includeVideoLink: true,
    },
  });

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: ScheduleFollowUpData) => {
      if (!convert) return;
      await apiRequest("POST", `/api/leader/converts/${convert.id}/schedule-followup`, data);
    },
    onSuccess: () => {
      toast({
        title: "Follow-up scheduled",
        description: "The follow-up has been scheduled and email notifications will be sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts", convert?.id?.toString()] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/followups"] });
      onOpenChange(false);
      form.reset({
        nextFollowupDate: "",
        customLeaderSubject: "",
        customLeaderMessage: "",
        customConvertSubject: "",
        customConvertMessage: "",
        includeVideoLink: true,
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
              <>Schedule a follow-up with {convert.firstName} {convert.lastName} and send email notifications</>
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
                      Add a free Jitsi Meet video call link to the email
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

              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  Your Reminder Email{" "}
                  <span className="italic text-muted-foreground font-normal">
                    (Email will be sent to {convert?.firstName} {convert?.lastName} a day before the scheduled follow up)
                  </span>
                </p>
                <FormField
                  control={form.control}
                  name="customLeaderSubject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Line</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Leave blank for default subject..."
                          {...field}
                          data-testid="input-leader-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customLeaderMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Body</FormLabel>
                      <FormControl>
                        <AITextarea
                          value={field.value || ""}
                          onChange={(text) => form.setValue("customLeaderMessage", text)}
                          placeholder="Leave blank for default message..."
                          context={`Writing a reminder email to ${convert?.firstName} ${convert?.lastName} about an upcoming follow-up meeting from a church ministry.`}
                          aiPlaceholder="e.g., Write a friendly reminder..."
                          rows={4}
                          data-testid="input-leader-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
