import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, BookOpen, Loader2, Lock, Users, Pencil, Trash2 } from "lucide-react";

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  isPrivate: string;
  sharedWithMinistryId: string | null;
  createdAt: string;
  updatedAt: string;
}

const journalEntrySchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  isPrivate: z.boolean(),
  shareWithMinistry: z.boolean(),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

export default function MemberJournal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: journalData, isLoading, error } = useQuery<{ entries: JournalEntry[] }>({
    queryKey: ["/api/member/journal"],
  });

  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      title: "",
      content: "",
      isPrivate: true,
      shareWithMinistry: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      return await apiRequest("POST", "/api/member/journal", {
        title: data.title || null,
        content: data.content,
        isPrivate: data.isPrivate,
        shareWithMinistry: data.shareWithMinistry && !data.isPrivate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/journal"] });
      form.reset();
      setDialogOpen(false);
      toast({
        title: "Entry created",
        description: "Your journal entry has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "Failed to save journal entry.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: JournalEntryFormData }) => {
      return await apiRequest("PATCH", `/api/member/journal/${id}`, {
        title: data.title || null,
        content: data.content,
        isPrivate: data.isPrivate,
        shareWithMinistry: data.shareWithMinistry && !data.isPrivate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/journal"] });
      form.reset();
      setDialogOpen(false);
      setEditingEntry(null);
      toast({
        title: "Entry updated",
        description: "Your journal entry has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message || "Failed to update journal entry.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/member/journal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/journal"] });
      setDeleteConfirmId(null);
      toast({
        title: "Entry deleted",
        description: "Your journal entry has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete",
        description: error.message || "Failed to delete journal entry.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    setLocation("/member-portal/login");
    return null;
  }

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    form.reset({
      title: entry.title || "",
      content: entry.content,
      isPrivate: entry.isPrivate === "true",
      shareWithMinistry: entry.sharedWithMinistryId !== null,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingEntry(null);
      form.reset();
    }
    setDialogOpen(open);
  };

  const handleSubmit = (data: JournalEntryFormData) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPrivate = form.watch("isPrivate");
  const entries = journalData?.entries || [];

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/member-portal">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">My Journal</h1>
              <p className="text-muted-foreground">Personal reflections and spiritual notes</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-entry">
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
                <DialogDescription>
                  Write your thoughts, prayers, or reflections.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Give your entry a title..."
                            {...field}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write your thoughts..."
                            className="min-h-[180px] resize-none"
                            {...field}
                            data-testid="textarea-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Private Entry
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Only you can see this entry
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-private"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!isPrivate && (
                    <FormField
                      control={form.control}
                      name="shareWithMinistry"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Share with Ministry Leaders
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Your ministry leaders can see this entry
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-share"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending} 
                      data-testid="button-save-entry"
                    >
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingEntry ? "Update Entry" : "Save Entry"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} data-testid={`card-entry-${entry.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {entry.title || "Untitled Entry"}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.isPrivate === "true" ? (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Users className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {entry.updatedAt !== entry.createdAt && (
                          <span className="text-sm text-muted-foreground italic">
                            (edited)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(entry)}
                        data-testid={`button-edit-${entry.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteConfirmId(entry.id)}
                        data-testid={`button-delete-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Journal Entries Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start documenting your spiritual journey with your first entry.
                </p>
                <Button onClick={() => setDialogOpen(true)} data-testid="button-first-entry">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This entry will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
