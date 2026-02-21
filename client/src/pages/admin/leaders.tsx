import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Plus, Mail, Users, Loader2, KeyRound, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const leaderFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  churchId: z.string().min(1, "Please select a ministry"),
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
      firstName: "",
      lastName: "",
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
        title: t('leaders.leaderCreated'),
        description: t('leaders.leaderCreatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
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
        title: t('leaders.passwordReset'),
        description: t('leaders.passwordResetDesc'),
      });
      setResetDialogOpen(false);
      setSelectedLeader(null);
      resetForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/leaders/${selectedLeader?.id}`);
    },
    onSuccess: () => {
      toast({
        title: t('leaders.leaderDeleted'),
        description: t('leaders.leaderDeletedDesc'),
      });
      setDeleteDialogOpen(false);
      setSelectedLeader(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaders"] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const openResetDialog = (leader: LeaderWithChurch) => {
    setSelectedLeader(leader);
    resetForm.reset({ newPassword: "" });
    setResetDialogOpen(true);
  };

  const openDeleteDialog = (leader: LeaderWithChurch) => {
    setSelectedLeader(leader);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('sidebar.leaders')}
          description={t('leaders.description')}
          actions={
            <Button className="gap-2" onClick={() => setDialogOpen(true)} data-testid="button-add-leader">
              <Plus className="h-4 w-4" />
              {t('leaders.addLeader')}
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
          ) : leaders && leaders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('forms.name')}</TableHead>
                  <TableHead>{t('forms.email')}</TableHead>
                  <TableHead>{t('forms.ministry') || t('sidebar.ministries')}</TableHead>
                  <TableHead>{t('forms.date')}</TableHead>
                  <TableHead className="text-right">{t('forms.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader) => {
                  const initials = `${leader.firstName?.[0] || ''}${leader.lastName?.[0] || ''}`.toUpperCase();

                  return (
                    <TableRow key={leader.id} data-testid={`row-leader-${leader.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{leader.firstName} {leader.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {leader.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {leader.church ? (
                          <Badge variant="secondary">{leader.church.name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(leader.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetDialog(leader)}
                            className="gap-1"
                            data-testid={`button-reset-password-${leader.id}`}
                          >
                            <KeyRound className="h-3 w-3" />
                            {t('forms.resetPassword')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(leader)}
                            className="gap-1 text-destructive hover:text-destructive"
                            data-testid={`button-delete-leader-${leader.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            {t('forms.delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-sm font-semibold mb-2">{t('leaders.noLeaders')}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {churches && churches.length > 0
                  ? t('leaders.addFirstLeader')
                  : t('leaders.createMinistryFirst')}
              </p>
              {churches && churches.length > 0 && (
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('leaders.addLeader')}
                </Button>
              )}
            </div>
          )}
        </Section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('leaders.createLeader')}</DialogTitle>
            <DialogDescription>
              {t('leaders.createLeaderDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.firstName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('forms.firstName')}
                          {...field}
                          data-testid="input-leader-first-name"
                        />
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
                      <FormLabel>{t('forms.lastName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('forms.lastName')}
                          {...field}
                          data-testid="input-leader-last-name"
                        />
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
                    <FormLabel>{t('forms.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('forms.emailAddress')}
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
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('leaders.minimumChars')}
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
                    <FormLabel>{t('forms.ministry')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-leader-church">
                          <SelectValue placeholder={t('forms.selectMinistry')} />
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
                  {t('forms.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-leader"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('leaders.creating')}
                    </>
                  ) : (
                    t('leaders.createLeader')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('forms.resetPassword')}</DialogTitle>
            <DialogDescription>
              {t('leaders.resetPasswordDesc', { name: `${selectedLeader?.firstName} ${selectedLeader?.lastName}` })}
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
                    <FormLabel>{t('settings.newPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('leaders.minimumChars')}
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
                  {t('forms.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-confirm-reset"
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('leaders.resetting')}
                    </>
                  ) : (
                    t('forms.resetPassword')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('leaders.deleteLeaderTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('leaders.deleteLeaderDesc', { name: `${selectedLeader?.firstName} ${selectedLeader?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forms.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('leaders.deleting')}
                </>
              ) : (
                t('forms.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
