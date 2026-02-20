import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Leader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface LeaderQuota {
  currentCount: number;
  maxAllowed: number;
  remaining: number;
  canAddMore: boolean;
}

const addLeaderSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
});

type AddLeaderFormData = z.infer<typeof addLeaderSchema>;

export default function MinistryAdminLeaders() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);

  const { data: leaders, isLoading } = useQuery<Leader[]>({
    queryKey: ["/api/ministry-admin/leaders"],
  });

  const { data: quota, isLoading: isLoadingQuota } = useQuery<LeaderQuota>({
    queryKey: ["/api/ministry-admin/leader-quota"],
  });

  const form = useForm<AddLeaderFormData>({
    resolver: zodResolver(addLeaderSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const addLeaderMutation = useMutation({
    mutationFn: async (data: AddLeaderFormData) => {
      const res = await apiRequest("POST", "/api/ministry-admin/leaders", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.credentials) {
        toast({
          title: "Leader Added - Email Failed",
          description: `Please manually share credentials. Email: ${data.credentials.email}, Temporary Password: ${data.credentials.temporaryPassword}`,
          duration: 30000,
        });
      } else {
        toast({
          title: "Leader Added",
          description: "The leader account has been created and login credentials have been sent via email.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/leader-quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/stats"] });
      form.reset();
      setAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Leader",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLeaderMutation = useMutation({
    mutationFn: async (leaderId: string) => {
      await apiRequest("DELETE", `/api/ministry-admin/leaders/${leaderId}`);
    },
    onSuccess: () => {
      toast({
        title: "Leader Removed",
        description: "The leader has been removed from your ministry.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/leader-quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/stats"] });
      setDeleteDialogOpen(false);
      setSelectedLeader(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove Leader",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddLeader = (data: AddLeaderFormData) => {
    addLeaderMutation.mutate(data);
  };

  const handleDeleteClick = (leader: Leader) => {
    setSelectedLeader(leader);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedLeader) {
      deleteLeaderMutation.mutate(selectedLeader.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Manage Leaders"
          description="Add and manage leaders for your ministry"
          actions={
            <div className="flex items-center gap-4 flex-wrap">
              {quota && (
                <Badge variant={quota.canAddMore ? "secondary" : "destructive"} data-testid="badge-quota">
                  {quota.currentCount}/{quota.maxAllowed} Leaders
                </Badge>
              )}
              <Button
                onClick={() => setAddDialogOpen(true)}
                disabled={!quota?.canAddMore}
                data-testid="button-add-leader"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Leader
              </Button>
            </div>
          }
        />

        <Section
          title="Ministry Leaders"
          description="Leaders can manage converts, new members, and members for your ministry"
          noPadding
        >
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !leaders || leaders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground p-4">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No Leaders Yet</p>
              <p className="text-xs mt-1">Add your first leader to get started</p>
              {quota?.canAddMore && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)} data-testid="button-add-first-leader">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Leader
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader) => (
                  <TableRow key={leader.id} data-testid={`row-leader-${leader.id}`}>
                    <TableCell className="font-medium text-sm">
                      {leader.firstName} {leader.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {leader.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(leader.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(leader)}
                        data-testid={`button-delete-leader-${leader.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        {!isLoadingQuota && quota && !quota.canAddMore && (
          <div className="rounded-md border border-accent/50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Leader Limit Reached</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You have reached the maximum of {quota.maxAllowed} leaders for your ministry. 
                  Remove an existing leader to add a new one.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) form.reset();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Leader</DialogTitle>
            <DialogDescription>
              Enter the leader's details. They will receive an email with their login credentials.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddLeader)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-leader-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} data-testid="input-leader-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} data-testid="input-leader-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 000-0000" {...field} data-testid="input-leader-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addLeaderMutation.isPending} data-testid="button-submit-add-leader">
                  {addLeaderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Leader"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Leader</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedLeader?.firstName} {selectedLeader?.lastName} as a leader? 
              They will no longer be able to access the leader dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLeaderMutation.isPending}
              data-testid="button-confirm-delete-leader"
            >
              {deleteLeaderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Leader"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
