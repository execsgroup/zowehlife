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
import { format } from "date-fns";

const addNoteSchema = z.object({
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
  notes: z.string().optional(),
});

type AddNoteData = z.infer<typeof addNoteSchema>;

interface ConvertInfo {
  id: string | number;
  firstName: string;
  lastName: string;
}

interface ConvertAddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convert: ConvertInfo | null;
}

export function ConvertAddNoteDialog({
  open,
  onOpenChange,
  convert,
}: ConvertAddNoteDialogProps) {
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
      if (!convert) return;
      await apiRequest("POST", `${apiBasePath}/converts/${convert.id}/checkins`, {
        checkinDate: format(new Date(), "yyyy-MM-dd"),
        outcome: data.outcome,
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      toast({
        title: t('followUps.notesRecorded'),
        description: t('followUps.notesSaved'),
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`, convert?.id?.toString()] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/stats`] });
      onOpenChange(false);
      form.reset({
        outcome: "CONNECTED",
        notes: "",
      });
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
            {convert && (
              <>{t('followUps.recordFollowUp', { name: `${convert.firstName} ${convert.lastName}` })}</>
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
                      <SelectItem value="CONNECTED">Connected</SelectItem>
                      <SelectItem value="NO_RESPONSE">No Response</SelectItem>
                      <SelectItem value="NEEDS_PRAYER">Needs Prayer</SelectItem>
                      <SelectItem value="SCHEDULED_VISIT">Scheduled Visit</SelectItem>
                      <SelectItem value="REFERRED">Referred</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
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
                      context="Follow-up note for a convert in a ministry"
                      data-testid="input-note-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('forms.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={addNoteMutation.isPending}
                data-testid="button-save-note"
              >
                {addNoteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('forms.saving')}
                  </>
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
