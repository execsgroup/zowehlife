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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Check, X, Mail, Phone, MapPin, Calendar, Loader2, FileText, Edit, User } from "lucide-react";

interface MinistryRequest {
  id: string;
  ministryName: string;
  location: string | null;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string | null;
  description: string | null;
  plan: "free" | "foundations" | "formation" | "stewardship";
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

export default function MinistryRequests() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const reviewFormSchema = z.object({
    ministryName: z.string().min(2, t('validation.ministryNameMinLength')),
    location: z.string().optional(),
    adminFirstName: z.string().min(1, t('validation.firstNameRequired')),
    adminLastName: z.string().min(1, t('validation.lastNameRequired')),
    adminEmail: z.string().email(t('validation.invalidEmail')),
    adminPhone: z.string().optional(),
    description: z.string().optional(),
    plan: z.enum(["free", "foundations", "formation", "stewardship"]).default("foundations"),
  });

  type ReviewFormData = z.infer<typeof reviewFormSchema>;
  const [reviewingRequest, setReviewingRequest] = useState<MinistryRequest | null>(null);

  const { data: requests, isLoading } = useQuery<MinistryRequest[]>({
    queryKey: ["/api/admin/ministry-requests"],
  });

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      ministryName: "",
      location: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPhone: "",
      description: "",
      plan: "foundations",
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      const res = await apiRequest("POST", `/api/admin/ministry-requests/${reviewingRequest?.id}/approve`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.credentials) {
        toast({
          title: t('ministryRequests.emailFailed'),
          description: t('ministryRequests.emailFailedDesc', { email: data.credentials.email, password: data.credentials.temporaryPassword }),
          duration: 30000,
        });
      } else {
        toast({
          title: t('ministryRequests.approved'),
          description: t('ministryRequests.approvedDesc'),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ministry-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/churches"] });
      setReviewingRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('ministryRequests.approvalFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/ministry-requests/${reviewingRequest?.id}/deny`);
    },
    onSuccess: () => {
      toast({
        title: t('ministryRequests.denied'),
        description: t('ministryRequests.deniedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ministry-requests"] });
      setReviewingRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('ministryRequests.denialFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = (request: MinistryRequest) => {
    form.reset({
      ministryName: request.ministryName,
      location: request.location || "",
      adminFirstName: request.adminFirstName,
      adminLastName: request.adminLastName,
      adminEmail: request.adminEmail,
      adminPhone: request.adminPhone || "",
      description: request.description || "",
      plan: request.plan || "foundations",
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
          title={t('sidebar.ministryRequests')}
          description={t('ministryRequests.description')}
        />

        <Section
          title={t('ministryRequests.pendingRequests')}
          description={t('ministryRequests.pendingDescription')}
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
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('ministryRequests.noPending')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('forms.ministry')}</TableHead>
                  <TableHead>{t('forms.location')}</TableHead>
                  <TableHead>{t('forms.contact')}</TableHead>
                  <TableHead>{t('forms.description')}</TableHead>
                  <TableHead>{t('forms.date')}</TableHead>
                  <TableHead className="text-right">{t('forms.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-ministry-request-${request.id}`}>
                    <TableCell className="font-medium text-sm">{request.ministryName}</TableCell>
                    <TableCell>
                      {request.location ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {request.location}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {request.adminFirstName} {request.adminLastName}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {request.adminEmail}
                        </div>
                        {request.adminPhone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {request.adminPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.description ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px]">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{request.description}</span>
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
                        data-testid={`button-review-ministry-${request.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        {t('ministryRequests.review')}
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
            title={t('ministryRequests.processedRequests')}
            description={t('ministryRequests.processedDescription')}
            noPadding
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('forms.ministry')}</TableHead>
                  <TableHead>{t('forms.name')}</TableHead>
                  <TableHead>{t('forms.email')}</TableHead>
                  <TableHead>{t('forms.status')}</TableHead>
                  <TableHead>{t('forms.date')}</TableHead>
                  <TableHead>{t('ministryRequests.reviewed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-ministry-history-${request.id}`}>
                    <TableCell className="font-medium text-sm">{request.ministryName}</TableCell>
                    <TableCell className="text-sm">{request.adminFirstName} {request.adminLastName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.adminEmail}</TableCell>
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
            <DialogTitle>{t('ministryRequests.reviewTitle')}</DialogTitle>
            <DialogDescription>
              {t('ministryRequests.reviewDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="ministryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('churches.ministryName')}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-review-ministry-name" />
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
                      <Input {...field} data-testid="input-review-ministry-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adminFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.firstName')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-review-admin-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.lastName')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-review-admin-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="adminEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-review-admin-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.phone')}</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} data-testid="input-review-admin-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none"
                        rows={3}
                        data-testid="input-review-description"
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
                    <FormLabel>{t('forms.plan')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-review-plan">
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
            </form>
          </Form>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={handleDeny}
              disabled={denyMutation.isPending || approveMutation.isPending}
              data-testid="button-dialog-deny-ministry"
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
              data-testid="button-dialog-approve-ministry"
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
