import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        title: "Claim email sent",
        description: "A new account claim email has been sent to the member.",
      });
      setResendingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend",
        description: error.message || "Could not resend the claim email.",
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
        title: variables.status === "SUSPENDED" ? "Account suspended" : "Account activated",
        description: variables.status === "SUSPENDED" 
          ? "The member account has been suspended."
          : "The member account has been activated.",
      });
      setSuspendDialog({ open: false, account: null, action: "SUSPENDED" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Could not update account status.",
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
        return <Badge data-testid="badge-status-active" variant="default">Active</Badge>;
      case "PENDING_CLAIM":
        return <Badge data-testid="badge-status-pending" variant="secondary">Pending Claim</Badge>;
      case "SUSPENDED":
        return <Badge data-testid="badge-status-suspended" variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "convert":
        return <Badge data-testid="badge-type-convert" variant="outline">Convert</Badge>;
      case "new_member":
        return <Badge data-testid="badge-type-new-member" variant="outline">New Member</Badge>;
      case "member":
        return <Badge data-testid="badge-type-member" variant="outline">Member</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Member Accounts</h1>
            <p className="text-muted-foreground">
              View and manage member portal accounts for your ministry
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Portal Accounts
                </CardTitle>
                <CardDescription>
                  Members who can access the member portal
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search members..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !filteredAccounts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{search ? "No matching accounts found" : "No member accounts yet"}</p>
                <p className="text-sm mt-1">
                  Member accounts are created when people submit public forms with their email
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                              Never
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
                                <span className="ml-1 hidden sm:inline">Resend</span>
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
                                <span className="ml-1 hidden sm:inline">Suspend</span>
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
                                <span className="ml-1 hidden sm:inline">Activate</span>
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
          </CardContent>
        </Card>

        <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ ...suspendDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {suspendDialog.action === "SUSPENDED" ? "Suspend Account?" : "Activate Account?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {suspendDialog.action === "SUSPENDED"
                  ? `This will prevent ${suspendDialog.account?.firstName} ${suspendDialog.account?.lastName} from accessing the member portal.`
                  : `This will restore ${suspendDialog.account?.firstName} ${suspendDialog.account?.lastName}'s access to the member portal.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-status">Cancel</AlertDialogCancel>
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
                {suspendDialog.action === "SUSPENDED" ? "Suspend" : "Activate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
