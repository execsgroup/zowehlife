import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AITextarea } from "@/components/ai-text-helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const addNoteSchema = z.object({
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP"]),
  notes: z.string().optional(),
});

type AddNoteData = z.infer<typeof addNoteSchema>;

interface NewMemberInfo {
  id: string | number;
  firstName: string;
  lastName: string;
}

interface NewMemberAddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newMember: NewMemberInfo | null;
  checkinId?: string | null;
}

export function NewMemberAddNoteDialog({
  open,
  onOpenChange,
  newMember,
  checkinId,
}: NewMemberAddNoteDialogProps) {
  const { toast } = useToast();
  const apiBasePath = useApiBasePath();
  const { t } = useTranslation();

  const form = useForm<AddNoteData>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: {
      outcome: "CONNECTED",
      notes: "",
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: AddNoteData) => {
      if (!newMember) return;
      if (checkinId) {
        const basePath = apiBasePath.includes("ministry-admin") ? "/api/ministry-admin" : "/api/leader";
        await apiRequest("PATCH", `${basePath}/new-member-checkins/${checkinId}/complete`, {
          outcome: data.outcome,
          notes: data.notes || "",
        });
      } else {
        const today = new Date().toISOString().split("T")[0];
        await apiRequest("POST", `${apiBasePath}/new-members/${newMember.id}/checkins`, {
          checkinDate: today,
          outcome: data.outcome,
          notes: data.notes || "",
        });
      }
    },
    onSuccess: () => {
      toast({
        title: t('followUps.notesRecorded'),
        description: t('followUps.notesSaved'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`, newMember?.id?.toString()] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/stats`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-member-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/new-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/new-members"] });
      onOpenChange(false);
      form.reset({ outcome: "CONNECTED", notes: "" });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('followUps.failedToSaveNotes'),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('followUps.addNote')}</DialogTitle>
          <DialogDescription>
            {newMember && (
              <>{t('followUps.recordFollowUp', { name: `${newMember.firstName} ${newMember.lastName}` })}</>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => addNoteMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.outcome')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-note-outcome">
                        <SelectValue placeholder={t('followUps.selectOutcome')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CONNECTED">{t('statusLabels.connected')}</SelectItem>
                      <SelectItem value="NO_RESPONSE">{t('statusLabels.notConnected')}</SelectItem>
                      <SelectItem value="NEEDS_FOLLOWUP">{t('statusLabels.needsFollowUp')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.notes')}</FormLabel>
                  <FormControl>
                    <AITextarea
                      placeholder={t('followUps.followUpNotesPlaceholder')}
                      value={field.value || ""}
                      onChange={field.onChange}
                      context="Follow-up note for a new member in a ministry"
                      data-testid="input-note-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('forms.cancel')}
              </Button>
              <Button type="submit" disabled={addNoteMutation.isPending} data-testid="button-save-note">
                {addNoteMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('forms.saving')}</>
                ) : (
                  t('forms.saveNote')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
