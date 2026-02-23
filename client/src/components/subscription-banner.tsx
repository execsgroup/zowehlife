import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface SubscriptionData {
  plan: string;
  subscriptionStatus: string;
  hasStripeSubscription?: boolean;
}

export function SubscriptionBanner() {
  const { user } = useAuth();
  const apiBasePath = useApiBasePath();

  const apiPath = `${apiBasePath}/subscription`;

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: [apiPath],
    enabled: !!user && (user.role === "MINISTRY_ADMIN" || user.role === "LEADER"),
  });

  if (!subscription) return null;

  const isInactive = subscription.subscriptionStatus === "past_due" || subscription.subscriptionStatus === "suspended" || subscription.subscriptionStatus === "canceled";

  if (!isInactive) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4 flex items-center gap-3 flex-wrap" data-testid="banner-subscription-inactive">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">
          Subscription Inactive
        </p>
        <p className="text-xs text-muted-foreground">
          Your ministry is in read-only mode. {user?.role === "MINISTRY_ADMIN" ? "Update your payment method to restore full access." : "Contact your ministry administrator to resolve billing."}
        </p>
      </div>
      {user?.role === "MINISTRY_ADMIN" && (
        <Link href="/ministry-admin/billing">
          <Button size="sm" variant="destructive" className="gap-1 shrink-0" data-testid="button-fix-billing">
            <CreditCard className="h-3 w-3" />
            Fix Billing
          </Button>
        </Link>
      )}
    </div>
  );
}
