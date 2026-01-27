import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Check, X, Mail, Phone, Church, Calendar, Loader2, FileText } from "lucide-react";

interface AccountRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  churchId: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  church: { id: string; name: string } | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  APPROVED: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  DENIED: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AccountRequests() {
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery<AccountRequest[]>({
    queryKey: ["/api/admin/account-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/account-requests/${id}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "The leader account has been created and the applicant has been notified via email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/account-requests/${id}/deny`);
    },
    onSuccess: () => {
      toast({
        title: "Request Denied",
        description: "The applicant has been notified via email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Denial Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingRequests = requests?.filter(r => r.status === "PENDING") || [];
  const processedRequests = requests?.filter(r => r.status !== "PENDING") || [];

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Account Requests</h1>
          <p className="text-muted-foreground">Review and manage leader account requests</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" data-testid="badge-pending-count">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              New leader account requests awaiting your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Church</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell className="font-medium">{request.fullName}</TableCell>
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
                        <div className="flex items-center gap-1">
                          <Church className="h-4 w-4 text-muted-foreground" />
                          {request.church?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.reason ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px]">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{request.reason}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="gap-1 text-chart-4 hover:text-chart-4"
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Account Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will create a leader account for <strong>{request.fullName}</strong> at <strong>{request.church?.name}</strong>. 
                                  They will receive an email with their login credentials.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => approveMutation.mutate(request.id)}
                                  data-testid={`button-confirm-approve-${request.id}`}
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="gap-1 text-destructive hover:text-destructive"
                                disabled={denyMutation.isPending}
                                data-testid={`button-deny-${request.id}`}
                              >
                                {denyMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                                Deny
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deny Account Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deny the account request from <strong>{request.fullName}</strong>? 
                                  They will receive a notification email.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => denyMutation.mutate(request.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-deny-${request.id}`}
                                >
                                  Deny
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {processedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                Previously processed account requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Church</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-history-${request.id}`}>
                      <TableCell className="font-medium">{request.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{request.email}</TableCell>
                      <TableCell>{request.church?.name || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[request.status]}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
