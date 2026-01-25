import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Church, type User } from "@shared/schema";
import { Plus, Mail, Users, Loader2, KeyRound } from "lucide-react";
import { format } from "date-fns";

const leaderFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  churchId: z.string().min(1, "Please select a church"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type LeaderFormData = z.infer<typeof leaderFormSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

interface LeaderWithChurch extends Omit<User, "passwordHash"> {
  church?: { id: string; name: string } | null;
}

export default function AdminLeaders() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<LeaderWithChurch | null>(null);

  const { data: leaders, isLoading } = useQuery<LeaderWithChurch[]>({
    queryKey: ["/api/admin/leaders"],
  });

  const { data: churches } = useQuery<Church[]>({
    queryKey: ["/api/admin/churches"],
  });

  const form = useForm<LeaderFormData>({
    resolver: zodResolver(leaderFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      churchId: "",
    },
  });

  const resetForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaderFormData) => {
      await apiRequest("POST", "/api/admin/leaders", data);
    },
    onSuccess: () => {
      toast({
        title: "Leader created",
        description: "The new leader account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create leader",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      await apiRequest("POST", `/api/admin/leaders/${selectedLeader?.id}/reset-password`, data);
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "The leader's password has been reset successfully.",
      });
      setResetDialogOpen(false);
      setSelectedLeader(null);
      resetForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const openResetDialog = (leader: LeaderWithChurch) => {
    setSelectedLeader(leader);
    resetForm.reset({ newPassword: "" });
    setResetDialogOpen(true);
  };

  return (
    <DashboardLayout title="Leaders">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Leader Management</h2>
            <p className="text-muted-foreground">
              Create and manage church leader accounts
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-leader">
                <Plus className="h-4 w-4" />
                Add Leader
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Leader</DialogTitle>
                <DialogDescription>
                  Create a new leader account and assign them to a church.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter full name"
                            {...field}
                            data-testid="input-leader-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="leader@example.com"
                            {...field}
                            data-testid="input-leader-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Minimum 8 characters"
                            {...field}
                            data-testid="input-leader-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="churchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Church</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-leader-church">
                              <SelectValue placeholder="Select a church" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {churches?.map((church) => (
                              <SelectItem key={church.id} value={church.id}>
                                {church.name}
                              </SelectItem>
                            ))}
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
                      data-testid="button-save-leader"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Leader"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Set a new password for {selectedLeader?.fullName}
                </DialogDescription>
              </DialogHeader>
              <Form {...resetForm}>
                <form
                  onSubmit={resetForm.handleSubmit((data) => resetPasswordMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={resetForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Minimum 8 characters"
                            {...field}
                            data-testid="input-new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={resetPasswordMutation.isPending}
                      data-testid="button-confirm-reset"
                    >
                      {resetPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : leaders && leaders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leader</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Church</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((leader) => {
                    const initials = leader.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <TableRow key={leader.id} data-testid={`row-leader-${leader.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{leader.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {leader.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {leader.church ? (
                            <Badge variant="secondary">{leader.church.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(leader.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetDialog(leader)}
                            className="gap-1"
                            data-testid={`button-reset-password-${leader.id}`}
                          >
                            <KeyRound className="h-3 w-3" />
                            Reset Password
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No leaders yet</h3>
                <p className="text-muted-foreground mb-4">
                  {churches && churches.length > 0
                    ? "Add your first church leader"
                    : "Create a church first, then add leaders"}
                </p>
                {churches && churches.length > 0 && (
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Leader
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
