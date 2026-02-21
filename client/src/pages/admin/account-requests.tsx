import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Check, X, Mail, Phone, Church, Calendar, Loader2, FileText, Edit } from "lucide-react";

interface AccountRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  churchName: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-accent/10 text-accent border-accent/20",
  APPROVED: "bg-gold/10 text-gold border-gold/20",
  DENIED: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AccountRequests() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const reviewFormSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string().email(t('validation.invalidEmail')),
    phone: z.string().optional(),
    churchName: z.string().min(2, t('validation.ministryNameMinLength')),
    reason: z.string().optional(),
  });

  type ReviewFormData = z.infer<typeof reviewFormSchema>;
  const [reviewingRequest, setReviewingRequest] = useState<AccountRequest | null>(null);

  const { data: requests, isLoading } = useQuery<AccountRequest[]>({
    queryKey: ["/api/admin/account-requests"],
  });

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      churchName: "",
      reason: "",
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      const res = await apiRequest("POST", `/api/admin/account-requests/${reviewingRequest?.id}/approve`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.credentials) {
        toast({
          title: t('accountRequests.emailFailed'),
          description: t('accountRequests.emailFailedDesc', { email: data.credentials.email, password: data.credentials.temporaryPassword }),
          duration: 30000,
        });
      } else {
        toast({
          title: t('accountRequests.approvedTitle'),
          description: t('accountRequests.approvedDesc'),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setReviewingRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('accountRequests.approvalFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/account-requests/${reviewingRequest?.id}/deny`);
    },
    onSuccess: () => {
      toast({
        title: t('accountRequests.denied'),
        description: t('accountRequests.deniedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-requests"] });
      setReviewingRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('accountRequests.denialFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = (request: AccountRequest) => {
    form.reset({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone || "",
      churchName: request.churchName,
      reason: request.reason || "",
    });
    setReviewingRequest(request);
  };

  const handleApprove = () => {
    const data = form.getValues();
    approveMutation.mutate(data);
  };

  const handleDeny = () => {
    denyMutation.mutate();
  };

  const pendingRequests = requests?.filter(r => r.status === "PENDING") || [];
  const processedRequests = requests?.filter(r => r.status !== "PENDING") || [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title={t('sidebar.accountRequests')}
          description={t('accountRequests.description')}
        />

        <Section
          title={t('accountRequests.pendingRequests')}
          description={t('accountRequests.pendingDescription')}
          actions={
            pendingRequests.length > 0 ? (
              <Badge variant="secondary" data-testid="badge-pending-count">{pendingRequests.length}</Badge>
            ) : undefined
          }
          noPadding
        >
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground p-4">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('accountRequests.noPending')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('forms.name')}</TableHead>
                  <TableHead>{t('forms.contact')}</TableHead>
                  <TableHead>{t('forms.ministry')}</TableHead>
                  <TableHead>{t('forms.reason')}</TableHead>
                  <TableHead>{t('forms.date')}</TableHead>
                  <TableHead className="text-right">{t('forms.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                    <TableCell className="font-medium text-sm">{request.firstName} {request.lastName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {request.email}
                        </div>
                        {request.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {request.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Church className="h-4 w-4 text-muted-foreground" />
                        {request.churchName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.reason ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px]">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{request.reason}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleReview(request)}
                        data-testid={`button-review-${request.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        {t('accountRequests.review')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        {processedRequests.length > 0 && (
          <Section
            title={t('accountRequests.processedRequests')}
            description={t('accountRequests.processedDescription')}
            noPadding
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('forms.name')}</TableHead>
                  <TableHead>{t('forms.email')}</TableHead>
                  <TableHead>{t('forms.ministry')}</TableHead>
                  <TableHead>{t('forms.status')}</TableHead>
                  <TableHead>{t('forms.date')}</TableHead>
                  <TableHead>{t('accountRequests.reviewed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-history-${request.id}`}>
                    <TableCell className="font-medium text-sm">{request.firstName} {request.lastName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.email}</TableCell>
                    <TableCell className="text-sm">{request.churchName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[request.status]}>
                        {t(`statusLabels.${request.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}
      </div>

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('accountRequests.reviewTitle')}</DialogTitle>
            <DialogDescription>
              {t('accountRequests.reviewDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.firstName')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-review-first-name" />
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
                        <Input {...field} data-testid="input-review-last-name" />
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
                      <Input type="email" {...field} data-testid="input-review-email" />
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
                    <FormLabel>{t('forms.phone')}</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} data-testid="input-review-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="churchName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('churches.ministryName')}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-review-church" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.reason')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none"
                        rows={3}
                        data-testid="input-review-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={handleDeny}
              disabled={denyMutation.isPending || approveMutation.isPending}
              data-testid="button-dialog-deny"
            >
              {denyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {t('common.deny')}
            </Button>
            <Button
              type="button"
              className="gap-1"
              onClick={handleApprove}
              disabled={approveMutation.isPending || denyMutation.isPending}
              data-testid="button-dialog-approve"
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t('common.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
