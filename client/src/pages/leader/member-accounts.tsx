import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Users, Mail, RefreshCw, UserCheck, UserX, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MemberAccountInfo {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "PENDING_CLAIM" | "ACTIVE" | "SUSPENDED";
  lastLoginAt: string | null;
  createdAt: string;
  affiliationType: "convert" | "new_member" | "member";
  affiliationId: string;
}

export default function LeaderMemberAccounts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; account: MemberAccountInfo | null; action: "ACTIVE" | "SUSPENDED" }>({
    open: false,
    account: null,
    action: "SUSPENDED",
  });

  const { data: accounts, isLoading } = useQuery<MemberAccountInfo[]>({
    queryKey: ["/api/leader/member-accounts"],
  });

  const resendClaimMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setResendingId(accountId);
      await apiRequest("POST", `/api/leader/member-accounts/${accountId}/resend-claim`);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('common.savedSuccessfully'),
      });
      setResendingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
      setResendingId(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => {
      await apiRequest("PATCH", `/api/leader/member-accounts/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leader/member-accounts"] });
      toast({
        title: variables.status === "SUSPENDED" ? t('common.suspended') : t('statusLabels.active'),
        description: t('common.updatedSuccessfully'),
      });
      setSuspendDialog({ open: false, account: null, action: "SUSPENDED" });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const filteredAccounts = accounts?.filter(account => {
    const searchLower = search.toLowerCase();
    return (
      account.firstName.toLowerCase().includes(searchLower) ||
      account.lastName.toLowerCase().includes(searchLower) ||
      account.email.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge data-testid="badge-status-active" variant="default">{t('statusLabels.active')}</Badge>;
      case "PENDING_CLAIM":
        return <Badge data-testid="badge-status-pending" variant="secondary">{t('memberAccounts.pendingClaim')}</Badge>;
      case "SUSPENDED":
        return <Badge data-testid="badge-status-suspended" variant="destructive">{t('common.suspended')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "convert":
        return <Badge data-testid="badge-type-convert" variant="outline">{t('sidebar.converts')}</Badge>;
      case "new_member":
        return <Badge data-testid="badge-type-new-member" variant="outline">{t('newMembers.title')}</Badge>;
      case "member":
        return <Badge data-testid="badge-type-member" variant="outline">{t('membersPage.title')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('sidebar.memberAccounts')}
          description={t('memberAccounts.description')}
        />

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('forms.searchPlaceholder')}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <Section noPadding>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !filteredAccounts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{search ? t('memberAccounts.noMatchingAccounts') : t('memberAccounts.noAccountsYet')}</p>
                <p className="text-sm mt-1">
                  {t('memberAccounts.description')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.email')}</TableHead>
                      <TableHead>{t('forms.type')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('forms.lastLogin')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                        <TableCell className="font-medium">
                          {account.firstName} {account.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {account.email}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(account.affiliationType)}</TableCell>
                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                        <TableCell>
                          {account.lastLoginAt ? (
                            format(new Date(account.lastLoginAt), "MMM d, yyyy")
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('statusLabels.neverContacted')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {account.status === "PENDING_CLAIM" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendClaimMutation.mutate(account.id)}
                                disabled={resendingId === account.id}
                                data-testid={`button-resend-${account.id}`}
                              >
                                {resendingId === account.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">{t('common.resendClaim')}</span>
                              </Button>
                            )}
                            {account.status === "ACTIVE" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSuspendDialog({ open: true, account, action: "SUSPENDED" })}
                                data-testid={`button-suspend-${account.id}`}
                              >
                                <UserX className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">{t('common.suspend')}</span>
                              </Button>
                            )}
                            {account.status === "SUSPENDED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSuspendDialog({ open: true, account, action: "ACTIVE" })}
                                data-testid={`button-activate-${account.id}`}
                              >
                                <UserCheck className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">{t('common.activate')}</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </Section>

        <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ ...suspendDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {suspendDialog.action === "SUSPENDED" ? t('memberAccounts.suspendAccount') : t('memberAccounts.activateAccount')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {suspendDialog.action === "SUSPENDED"
                  ? t('memberAccounts.suspendDesc', { name: `${suspendDialog.account?.firstName} ${suspendDialog.account?.lastName}` })
                  : t('memberAccounts.activateDesc', { name: `${suspendDialog.account?.firstName} ${suspendDialog.account?.lastName}` })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-status">{t('forms.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (suspendDialog.account) {
                    updateStatusMutation.mutate({
                      id: suspendDialog.account.id,
                      status: suspendDialog.action,
                    });
                  }
                }}
                data-testid="button-confirm-status"
              >
                {suspendDialog.action === "SUSPENDED" ? t('common.suspend') : t('common.activate')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
