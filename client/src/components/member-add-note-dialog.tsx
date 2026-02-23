import { useEffect } from "react";
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
  outcome: z.enum(["CONNECTED", "NO_RESPONSE"]),
  notes: z.string().optional(),
});

type AddNoteData = z.infer<typeof addNoteSchema>;

interface MemberInfo {
  id: string | number;
  firstName: string;
  lastName: string;
}

interface MemberAddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberInfo | null;
  checkinId?: string | null;
  initialValues?: { outcome: string; notes: string } | null;
}

export function MemberAddNoteDialog({
  open,
  onOpenChange,
  member,
  checkinId,
  initialValues,
}: MemberAddNoteDialogProps) {
  const { toast } = useToast();
  const apiBasePath = useApiBasePath();
  const { t } = useTranslation();

  const form = useForm<AddNoteData>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: {
      outcome: (initialValues?.outcome as any) || "CONNECTED",
      notes: initialValues?.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        outcome: (initialValues?.outcome as any) || "CONNECTED",
        notes: initialValues?.notes || "",
      });
    }
  }, [open, initialValues, form]);

  const isEditing = !!initialValues;

  const addNoteMutation = useMutation({
    mutationFn: async (data: AddNoteData) => {
      if (!member) return;
      if (checkinId) {
        await apiRequest("PATCH", `${apiBasePath}/member-checkins/${checkinId}/complete`, {
          outcome: data.outcome,
          notes: data.notes || "",
        });
      } else {
        const today = new Date().toISOString().split("T")[0];
        await apiRequest("POST", `${apiBasePath}/members/${member.id}/checkins`, {
          checkinDate: today,
          outcome: data.outcome,
          notes: data.notes || "",
        });
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? t('followUps.noteUpdated') : t('followUps.notesRecorded'),
        description: isEditing ? t('followUps.noteUpdatedDesc') : t('followUps.notesSaved'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`, member?.id?.toString()] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/member-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/stats`] });
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
          <DialogTitle>{isEditing ? t('followUps.editNote') : t('followUps.addNote')}</DialogTitle>
          <DialogDescription>
            {member && (
              <>{isEditing ? t('followUps.editFollowUpNote', { name: `${member.firstName} ${member.lastName}` }) : t('followUps.recordFollowUp', { name: `${member.firstName} ${member.lastName}` })}</>
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
                      context="Follow-up note for a member in a ministry"
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
