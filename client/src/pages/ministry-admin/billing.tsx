import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, ExternalLink, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface SubscriptionData {
  plan: string;
  subscriptionStatus: string;
  hasStripeSubscription: boolean;
}

const planKeys: Record<string, { nameKey: string; price: string; featuresKey: string }> = {
  free: { nameKey: "billing.free", price: "$0", featuresKey: "billing.planFeaturesFree" },
  foundations: { nameKey: "billing.foundations", price: "$19.99", featuresKey: "billing.planFeaturesFoundations" },
  formation: { nameKey: "billing.formation", price: "$29.99", featuresKey: "billing.planFeaturesFormation" },
  stewardship: { nameKey: "billing.stewardship", price: "$59.99", featuresKey: "billing.planFeaturesStewardship" },
};

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "active":
      return <Badge variant="default" data-testid="badge-status-active"><CheckCircle className="h-3 w-3 mr-1" />{t('common.active')}</Badge>;
    case "free":
      return <Badge variant="secondary" data-testid="badge-status-free"><CheckCircle className="h-3 w-3 mr-1" />{t('billing.free')}</Badge>;
    case "past_due":
      return <Badge variant="destructive" data-testid="badge-status-past-due"><AlertTriangle className="h-3 w-3 mr-1" />{t('statusLabels.pastDue')}</Badge>;
    case "suspended":
      return <Badge variant="destructive" data-testid="badge-status-suspended"><XCircle className="h-3 w-3 mr-1" />{t('common.suspended')}</Badge>;
    case "canceled":
      return <Badge variant="destructive" data-testid="badge-status-canceled"><XCircle className="h-3 w-3 mr-1" />{t('statusLabels.canceled')}</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

export default function MinistryAdminBilling() {
  const { t } = useTranslation();
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
        title: t('common.error'),
        description: error.message || t('billing.failedToOpenPortal'),
        variant: "destructive",
      });
    },
  });

  const plan = subscription?.plan || "foundations";
  const planDetail = planKeys[plan] || planKeys.foundations;
  const isInactive = subscription?.subscriptionStatus === "past_due" || subscription?.subscriptionStatus === "suspended" || subscription?.subscriptionStatus === "canceled";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('billing.title')}
          description={t('billing.description')}
        />

        {isInactive && (
          <div className="rounded-md border border-destructive p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-destructive" data-testid="text-subscription-warning">{t('billing.subscriptionInactive')}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('billing.subscriptionInactiveDesc')}
                </p>
                {subscription?.hasStripeSubscription && (
                  <Button
                    className="mt-3 gap-2"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-update-payment-urgent"
                  >
                    {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {t('billing.updatePaymentMethod')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <Section>
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-40" />
            </div>
          </Section>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Section title={t('billing.currentPlan')} description={t('billing.subscriptionDetails')}>
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xl font-bold" data-testid="text-plan-name">{t(planDetail.nameKey)}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-plan-price">{t('billing.pricePerMonth', { price: planDetail.price })}</p>
                  </div>
                  {subscription && getStatusBadge(subscription.subscriptionStatus, t)}
                </div>
                <p className="text-xs text-muted-foreground" data-testid="text-plan-features">{t(planDetail.featuresKey)}</p>
              </div>
            </Section>

            <Section title={t('billing.manageBilling')} description={t('billing.manageBillingDesc')}>
              <div className="space-y-4">
                {subscription?.plan === "free" ? (
                  <p className="text-xs text-muted-foreground" data-testid="text-free-plan-info">
                    {t('billing.freePlanInfo')}
                  </p>
                ) : subscription?.hasStripeSubscription ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t('billing.portalDesc')}
                    </p>
                    <Button
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      className="gap-2"
                      data-testid="button-manage-billing"
                    >
                      {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      {t('billing.manageBilling')}
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('billing.noBillingAccount')}
                  </p>
                )}
              </div>
            </Section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
