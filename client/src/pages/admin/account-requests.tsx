import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

const reviewFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  churchName: z.string().min(2, "Ministry name must be at least 2 characters"),
  reason: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

export default function AccountRequests() {
  const { toast } = useToast();
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
          title: "Account Created - Email Failed",
          description: `Please manually share credentials with the leader. Email: ${data.credentials.email}, Temporary Password: ${data.credentials.temporaryPassword}`,
          duration: 30000,
        });
      } else {
        toast({
          title: "Request Approved",
          description: "The leader account has been created and the applicant has been notified via email.",
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
        title: "Approval Failed",
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
        title: "Request Denied",
        description: "The applicant has been notified via email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-requests"] });
      setReviewingRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Denial Failed",
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
                    <TableHead>Ministry</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell className="font-medium">{request.firstName} {request.lastName}</TableCell>
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
                        <Button
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleReview(request)}
                          data-testid={`button-review-${request.id}`}
                        >
                          <Edit className="h-4 w-4" />
                          Review
                        </Button>
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
                    <TableHead>Ministry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-history-${request.id}`}>
                      <TableCell className="font-medium">{request.firstName} {request.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{request.email}</TableCell>
                      <TableCell>{request.churchName}</TableCell>
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

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Account Request</DialogTitle>
            <DialogDescription>
              Review and edit the request details before approving or denying. Upon approval, a new ministry will be created if it doesn't exist.
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
                      <FormLabel>First Name</FormLabel>
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
                      <FormLabel>Last Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                    <FormLabel>Phone</FormLabel>
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
                    <FormLabel>Ministry Name</FormLabel>
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
                    <FormLabel>Reason for Request</FormLabel>
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
              Deny Request
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
              Approve & Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
