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
import { useSortableTable } from "@/hooks/use-sortable-table";
import { SortableTableHead } from "@/components/sortable-table-head";

interface ChurchWithCounts extends Church {
  leaderCount: number;
  convertCount: number;
}

export default function AdminChurches() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const churchFormSchema = insertChurchSchema.extend({
    name: z.string().min(2, t('validation.nameMinLength')),
    location: z.string().min(2, t('validation.locationRequired')),
    plan: z.enum(["free", "foundations", "formation", "stewardship"]).default("foundations"),
    adminEmail: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
  });

  type ChurchFormData = z.infer<typeof churchFormSchema>;
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);
  
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [churchToDelete, setChurchToDelete] = useState<Church | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const { data: churches, isLoading } = useQuery<ChurchWithCounts[]>({
    queryKey: ["/api/admin/churches"],
  });

  const { sortedData: sortedChurches, sortConfig, requestSort } = useSortableTable(churches);

  const form = useForm<ChurchFormData>({
    resolver: zodResolver(churchFormSchema),
    defaultValues: {
      name: "",
      location: "",
      plan: "foundations",
      adminEmail: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChurchFormData) => {
      if (editingChurch) {
        const res = await apiRequest("PATCH", `/api/admin/churches/${editingChurch.id}`, data);
        return res.json?.() ?? {};
      } else {
        const email = (data.adminEmail ?? "").trim();
        if (!email) {
          throw new Error(t("churches.ministryAdminEmailRequired"));
        }
        const res = await apiRequest("POST", "/api/admin/churches", { ...data, adminEmail: email });
        return (await res.json()) as { church?: unknown; emailSent?: boolean; credentials?: { email: string; temporaryPassword: string } };
      }
    },
    onSuccess: (data: { church?: unknown; emailSent?: boolean; credentials?: { email: string; temporaryPassword: string } } | undefined) => {
      const withEmail = data?.emailSent === true;
      const emailFailed = data && "emailSent" in data && data.emailSent === false;
      const creds = data?.credentials;
      if (emailFailed && creds) {
        setPendingCredentials(creds);
        setCredentialsDialogOpen(true);
      }
      const description = editingChurch
        ? t('churches.ministryUpdatedDesc')
        : withEmail
          ? t('churches.ministryCreatedDescWithEmail')
          : emailFailed && creds
            ? t('churches.ministryCreatedEmailFailedWithCredentials', { email: creds.email, password: creds.temporaryPassword })
            : emailFailed
              ? t('churches.ministryCreatedEmailFailed')
              : t('churches.ministryCreatedDesc');
      toast({
        title: editingChurch ? t('churches.ministryUpdated') : t('churches.ministryCreated'),
        description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDialogOpen(false);
      setEditingChurch(null);
      form.reset();
    },
    onError: (error: Error) => {
      let description = error.message || t('common.failedToSave');
      const match = error.message?.match(/\d+:\s*(\{.*\})/);
      if (match) {
        try {
          const body = JSON.parse(match[1]) as { message?: string };
          if (body?.message?.includes("email already exists")) {
            description = t('churches.emailAlreadyInUse');
          } else if (body?.message) {
            description = body.message;
          }
        } catch {
          /* use original description */
        }
      }
      toast({
        title: t('common.error'),
        description,
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
        title: t('churches.ministryCancelled'),
        description: t('churches.ministryCancelledDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      closeDeleteDialog();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
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
      adminEmail: "",
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingChurch(null);
    form.reset({ name: "", location: "", plan: "foundations", adminEmail: "" });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('sidebar.ministries')}
          description={t('churches.description')}
          actions={
            <Button onClick={openCreateDialog} className="gap-2" data-testid="button-add-church">
              <Plus className="h-4 w-4" />
              {t('churches.addMinistry')}
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
          ) : sortedChurches && sortedChurches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={t('churches.ministryName')} sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableTableHead label={t('forms.location')} sortKey="location" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableTableHead label={t('forms.plan')} sortKey="plan" sortConfig={sortConfig} onSort={requestSort} />
                  <TableHead className="text-center">{t('sidebar.leaders')}</TableHead>
                  <SortableTableHead label={t('forms.createdAt')} sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort} />
                  <TableHead className="text-right">{t('forms.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedChurches.map((church) => (
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
                        {church.plan ? t(`billing.${church.plan}`) : t('billing.foundations')}
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
                            <p>{t('churches.viewProfile')}</p>
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
                            <p>{t('churches.editMinistry')}</p>
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
                            <p>{t('churches.cancelMinistry')}</p>
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
              <h3 className="text-sm font-semibold mb-2">{t('churches.noMinistries')}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('churches.addFirstMinistry')}
              </p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('churches.addMinistry')}
              </Button>
            </div>
          )}
        </Section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChurch ? t('churches.editMinistry') : t('churches.addMinistry')}</DialogTitle>
            <DialogDescription>
              {editingChurch
                ? t('churches.updateMinistryDesc')
                : t('churches.newMinistryDesc')}
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
                    <FormLabel>{t('churches.ministryName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('churches.enterMinistryName')}
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
                    <FormLabel>{t('forms.location')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('churches.cityState')}
                        {...field}
                        data-testid="input-church-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!editingChurch && (
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('churches.ministryAdminEmail')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('churches.ministryAdminEmailPlaceholder')}
                          {...field}
                          data-testid="input-ministry-admin-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.plan')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-church-plan">
                          <SelectValue placeholder={t('forms.selectPlan')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">{t('billing.free')}</SelectItem>
                        <SelectItem value="foundations">{t('billing.foundations')}</SelectItem>
                        <SelectItem value="formation">{t('billing.formation')}</SelectItem>
                        <SelectItem value="stewardship">{t('billing.stewardship')}</SelectItem>
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
                  data-testid="button-save-church"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('forms.saving')}
                    </>
                  ) : editingChurch ? (
                    t('churches.updateMinistry')
                  ) : (
                    t('churches.addMinistry')
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
              {deleteStep === 1 ? t('churches.cancelMinistry') : t('churches.confirmCancellation')}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 1 ? (
                <>
                  {t('churches.cancelConfirmDesc', { name: churchToDelete?.name })}
                </>
              ) : (
                <>
                  {t('churches.cancelConfirmStep2', { name: churchToDelete?.name })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteStep === 2 && (
            <div className="py-4">
              <Input
                placeholder={t('churches.typeCancelAccount')}
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
              {t('common.goBack')}
            </Button>
            {deleteStep === 1 ? (
              <Button
                variant="destructive"
                onClick={handleDeleteStep1}
                data-testid="button-proceed-delete"
              >
                {t('churches.cancelAccountButton')}
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
                    {t('churches.cancelling')}
                  </>
                ) : (
                  t('churches.confirmCancellation')
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('churches.ministryAdminCredentialsTitle')}</DialogTitle>
            <DialogDescription>
              {t('churches.ministryAdminCredentialsDesc')}
            </DialogDescription>
          </DialogHeader>
          {pendingCredentials && (
            <div className="space-y-3 py-2">
              <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                <p className="text-sm font-medium">{t('churches.ministryAdminEmail')}</p>
                <p className="text-sm font-mono break-all" data-testid="text-credential-email">{pendingCredentials.email}</p>
                <p className="text-sm font-medium mt-2">{t('churches.temporaryPassword')}</p>
                <p className="text-sm font-mono break-all" data-testid="text-credential-password">{pendingCredentials.temporaryPassword}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = `Email: ${pendingCredentials.email}\nTemporary password: ${pendingCredentials.temporaryPassword}`;
                  void navigator.clipboard.writeText(text);
                  toast({ title: t('churches.credentialsCopied'), description: t('churches.credentialsCopiedDesc') });
                }}
                data-testid="button-copy-credentials"
              >
                {t('churches.copyCredentials')}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setCredentialsDialogOpen(false); setPendingCredentials(null); }}>
              {t('churches.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
