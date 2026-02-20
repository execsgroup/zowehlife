import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertChurchSchema, type Church } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Users, Loader2, Pencil, Church as ChurchIcon, Eye, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

const churchFormSchema = insertChurchSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
  plan: z.enum(["free", "foundations", "formation", "stewardship"]).default("foundations"),
});

type ChurchFormData = z.infer<typeof churchFormSchema>;

interface ChurchWithCounts extends Church {
  leaderCount: number;
  convertCount: number;
}

export default function AdminChurches() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);
  
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [churchToDelete, setChurchToDelete] = useState<Church | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const { data: churches, isLoading } = useQuery<ChurchWithCounts[]>({
    queryKey: ["/api/admin/churches"],
  });

  const form = useForm<ChurchFormData>({
    resolver: zodResolver(churchFormSchema),
    defaultValues: {
      name: "",
      location: "",
      plan: "foundations",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChurchFormData) => {
      if (editingChurch) {
        await apiRequest("PATCH", `/api/admin/churches/${editingChurch.id}`, data);
      } else {
        await apiRequest("POST", "/api/admin/churches", data);
      }
    },
    onSuccess: () => {
      toast({
        title: editingChurch ? "Ministry updated" : "Ministry created",
        description: editingChurch
          ? "The ministry has been updated successfully."
          : "The new ministry has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDialogOpen(false);
      setEditingChurch(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save ministry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (churchId: string) => {
      await apiRequest("DELETE", `/api/admin/churches/${churchId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: "Ministry cancelled",
        description: "The ministry account has been cancelled and backed up. You can restore it from the Deleted Accounts page.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      closeDeleteDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ministry account",
        variant: "destructive",
      });
    },
  });

  const openDeleteDialog = (church: Church) => {
    setChurchToDelete(church);
    setDeleteStep(1);
    setConfirmText("");
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setChurchToDelete(null);
    setDeleteStep(1);
    setConfirmText("");
  };

  const handleDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleDeleteConfirm = () => {
    if (confirmText === "Cancel Account" && churchToDelete) {
      deleteMutation.mutate(churchToDelete.id);
    }
  };

  const openEditDialog = (church: Church) => {
    setEditingChurch(church);
    form.reset({
      name: church.name,
      location: church.location || "",
      plan: church.plan || "foundations",
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingChurch(null);
    form.reset({ name: "", location: "", plan: "foundations" });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ministry Management"
          description="Add and manage ministries in your organization"
          actions={
            <Button onClick={openCreateDialog} className="gap-2" data-testid="button-add-church">
              <Plus className="h-4 w-4" />
              Add Ministry
            </Button>
          }
        />

        <Section noPadding>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : churches && churches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ministry Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Leaders</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churches.map((church) => (
                  <TableRow key={church.id} data-testid={`row-church-${church.id}`}>
                    <TableCell className="font-medium text-sm">{church.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {church.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={church.plan === "stewardship" ? "default" : church.plan === "formation" ? "secondary" : "outline"}
                        data-testid={`badge-plan-${church.id}`}
                      >
                        {church.plan ? church.plan.charAt(0).toUpperCase() + church.plan.slice(1) : "Foundations"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {church.leaderCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(church.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => navigate(`/admin/ministry/${church.id}`)}
                              data-testid={`button-view-ministry-${church.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View ministry profile</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => openEditDialog(church)}
                              data-testid={`button-edit-church-${church.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit ministry</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => openDeleteDialog(church)}
                              data-testid={`button-delete-church-${church.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cancel ministry account</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <ChurchIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-sm font-semibold mb-2">No ministries yet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Get started by adding your first ministry
              </p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Ministry
              </Button>
            </div>
          )}
        </Section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChurch ? "Edit Ministry" : "Add New Ministry"}</DialogTitle>
            <DialogDescription>
              {editingChurch
                ? "Update the ministry information below."
                : "Enter the details for the new ministry."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ministry Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter ministry name"
                        {...field}
                        data-testid="input-church-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City, State"
                        {...field}
                        data-testid="input-church-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-church-plan">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="foundations">Foundations</SelectItem>
                        <SelectItem value="formation">Formation</SelectItem>
                        <SelectItem value="stewardship">Stewardship</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-church"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingChurch ? (
                    "Update Ministry"
                  ) : (
                    "Add Ministry"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {deleteStep === 1 ? "Cancel Ministry Account?" : "Confirm Cancellation"}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 1 ? (
                <>
                  Are you sure you want to cancel the account for{" "}
                  <span className="font-semibold">{churchToDelete?.name}</span>?
                  This will remove all ministry data including leaders, converts, and members.
                  A backup will be created that can be restored later.
                </>
              ) : (
                <>
                  This action will permanently remove all data for{" "}
                  <span className="font-semibold">{churchToDelete?.name}</span>.
                  To confirm, please type <span className="font-bold">Cancel Account</span> below.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteStep === 2 && (
            <div className="py-4">
              <Input
                placeholder="Type 'Cancel Account' to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                data-testid="input-confirm-delete"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              data-testid="button-cancel-delete"
            >
              Go Back
            </Button>
            {deleteStep === 1 ? (
              <Button
                variant="destructive"
                onClick={handleDeleteStep1}
                data-testid="button-proceed-delete"
              >
                Yes, Cancel Account
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={confirmText !== "Cancel Account" || deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
