import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Phone, Mail, User, Clock, FileText, Loader2, FileSpreadsheet } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FollowUp {
  id: string;
  convertId: string;
  convertFirstName: string;
  convertLastName: string;
  convertPhone: string | null;
  convertEmail: string | null;
  nextFollowupDate: string;
  notes: string | null;
}

const followUpNotesSchema = z.object({
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
  notes: z.string().optional(),
});

type FollowUpNotesData = z.infer<typeof followUpNotesSchema>;

function getDateBadge(dateStr: string, id: string) {
  const date = new Date(dateStr);
  const daysUntil = differenceInDays(date, new Date());
  
  if (isToday(date)) {
    return <Badge variant="destructive" data-testid={`badge-status-${id}`}>Today</Badge>;
  }
  if (isTomorrow(date)) {
    return <Badge variant="default" data-testid={`badge-status-${id}`}>Tomorrow</Badge>;
  }
  if (daysUntil <= 7) {
    return <Badge variant="secondary" data-testid={`badge-status-${id}`}>This Week</Badge>;
  }
  return <Badge variant="outline" data-testid={`badge-status-${id}`}>Upcoming</Badge>;
}

export default function LeaderFollowups() {
  const { toast } = useToast();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

  const { data: followups, isLoading } = useQuery<FollowUp[]>({
    queryKey: ["/api/leader/followups"],
  });

  const notesForm = useForm<FollowUpNotesData>({
    resolver: zodResolver(followUpNotesSchema),
    defaultValues: {
      outcome: "CONNECTED",
      notes: "",
    },
  });

  const notesMutation = useMutation({
    mutationFn: async (data: FollowUpNotesData) => {
      if (!selectedFollowUp) return;
      await apiRequest("POST", `/api/leader/converts/${selectedFollowUp.convertId}/checkins`, {
        checkinDate: format(new Date(), "yyyy-MM-dd"),
        outcome: data.outcome,
        notes: data.notes || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes recorded",
        description: "Your follow-up notes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/stats"] });
      setNotesDialogOpen(false);
      setSelectedFollowUp(null);
      notesForm.reset({
        outcome: "CONNECTED",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  const handleAddNotes = (followup: FollowUp) => {
    setSelectedFollowUp(followup);
    notesForm.reset({
      outcome: "CONNECTED",
      notes: "",
    });
    setNotesDialogOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch("/api/leader/followups/export-excel");
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `followups-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Unable to export follow-ups. Please try again.",
      });
    }
  };

  return (
    <DashboardLayout title="Follow-ups">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Follow-ups</h2>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Your scheduled follow-ups with new converts
            </p>
          </div>
          <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : followups && followups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Convert</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Follow-up Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.map((followup) => (
                    <TableRow key={followup.id} data-testid={`row-followup-${followup.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-convert-name-${followup.id}`}>
                            {followup.convertFirstName} {followup.convertLastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {followup.convertPhone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {followup.convertPhone}
                            </div>
                          )}
                          {followup.convertEmail && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {followup.convertEmail}
                            </div>
                          )}
                          {!followup.convertPhone && !followup.convertEmail && (
                            <span className="text-sm text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-followup-date-${followup.id}`}>
                            {format(new Date(followup.nextFollowupDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getDateBadge(followup.nextFollowupDate, followup.id)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {followup.notes || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleAddNotes(followup)}
                            data-testid={`button-followup-notes-${followup.id}`}
                          >
                            <FileText className="h-3 w-3" />
                            Follow Up Notes
                          </Button>
                          <Link href={`/leader/converts/${followup.convertId}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-convert-${followup.id}`}>
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming follow-ups</h3>
                <p className="text-muted-foreground mb-4">
                  When you schedule follow-ups with your converts, they'll appear here
                </p>
                <Link href="/leader/converts">
                  <Button data-testid="button-view-converts">
                    View Your Converts
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Follow Up Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow Up Notes</DialogTitle>
            <DialogDescription>
              {selectedFollowUp && (
                <>Record what happened during your follow-up with {selectedFollowUp.convertFirstName} {selectedFollowUp.convertLastName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...notesForm}>
            <form
              onSubmit={notesForm.handleSubmit((data) => notesMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={notesForm.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-notes-outcome">
                          <SelectValue placeholder="Select outcome" />
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
                control={notesForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What happened during this follow-up? Any prayer requests or next steps?"
                        className="resize-none min-h-[120px]"
                        {...field}
                        data-testid="input-notes-content"
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
                  onClick={() => setNotesDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={notesMutation.isPending}
                  data-testid="button-save-notes"
                >
                  {notesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Notes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
