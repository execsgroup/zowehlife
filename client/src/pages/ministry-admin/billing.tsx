import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, ExternalLink, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface SubscriptionData {
  plan: string;
  subscriptionStatus: string;
  hasStripeSubscription: boolean;
}

const planDetails: Record<string, { name: string; price: string; features: string }> = {
  free: { name: "Free", price: "$0/month", features: "1 Admin + 1 Leader" },
  foundations: { name: "Foundations", price: "$19.99/month", features: "1 Admin + 1 Leader" },
  formation: { name: "Formation", price: "$29.99/month", features: "1 Admin + up to 3 Leaders" },
  stewardship: { name: "Stewardship", price: "$59.99/month", features: "1 Admin + up to 10 Leaders" },
};

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default" data-testid="badge-status-active"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    case "free":
      return <Badge variant="secondary" data-testid="badge-status-free"><CheckCircle className="h-3 w-3 mr-1" />Free Plan</Badge>;
    case "past_due":
      return <Badge variant="destructive" data-testid="badge-status-past-due"><AlertTriangle className="h-3 w-3 mr-1" />Past Due</Badge>;
    case "suspended":
      return <Badge variant="destructive" data-testid="badge-status-suspended"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
    case "canceled":
      return <Badge variant="destructive" data-testid="badge-status-canceled"><XCircle className="h-3 w-3 mr-1" />Canceled</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

export default function MinistryAdminBilling() {
  const { toast } = useToast();

  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/ministry-admin/subscription"],
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ministry-admin/billing/portal");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const plan = subscription?.plan || "foundations";
  const details = planDetails[plan] || planDetails.foundations;
  const isInactive = subscription?.subscriptionStatus === "past_due" || subscription?.subscriptionStatus === "suspended" || subscription?.subscriptionStatus === "canceled";

  return (
    <DashboardLayout title="Billing & Subscription">
      <div className="space-y-6">
        {isInactive && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive" data-testid="text-subscription-warning">Subscription Inactive</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your subscription payment has failed or been canceled. Your ministry is currently in read-only mode. Update your payment method to restore full access.
                  </p>
                  {subscription?.hasStripeSubscription && (
                    <Button
                      className="mt-3 gap-2"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      data-testid="button-update-payment-urgent"
                    >
                      {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Update Payment Method
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-plan-title">Current Plan</CardTitle>
                <CardDescription>Your ministry's subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-plan-name">{details.name}</p>
                    <p className="text-muted-foreground" data-testid="text-plan-price">{details.price}</p>
                  </div>
                  {subscription && getStatusBadge(subscription.subscriptionStatus)}
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-plan-features">{details.features}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle data-testid="text-billing-title">Billing Management</CardTitle>
                <CardDescription>Manage your payment method and invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription?.plan === "free" ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-free-plan-info">
                    You're on the Free plan. No billing is required. To access more features and add more leaders, consider upgrading your plan.
                  </p>
                ) : subscription?.hasStripeSubscription ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Access your billing portal to update your payment method, view invoices, or manage your subscription.
                    </p>
                    <Button
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      className="gap-2"
                      data-testid="button-manage-billing"
                    >
                      {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      Manage Billing
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No billing account is linked to this ministry. Please contact support if you need assistance.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
