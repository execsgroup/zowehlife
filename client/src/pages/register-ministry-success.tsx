import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { CheckCircle, Loader2, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterMinistrySuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const requestId = params.get("request_id");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  const { data: paymentData, isLoading, isError } = useQuery<{ paymentStatus: string; plan: string }>({
    queryKey: ["/api/ministry-requests", requestId, "payment-status"],
    queryFn: async () => {
      if (!requestId) throw new Error("No request ID");
      const res = await fetch(`/api/ministry-requests/${requestId}/payment-status`);
      if (!res.ok) throw new Error("Failed to verify payment");
      return res.json();
    },
    enabled: !!requestId,
    refetchInterval: (query) => {
      if (query.state.data?.paymentStatus === "paid") return false;
      return 3000;
    },
    retry: 3,
  });

  const isPaid = paymentData?.paymentStatus === "paid";

  if (!requestId) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto">
              <Card>
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold" data-testid="text-success-title">Thank You</h2>
                  <p className="text-muted-foreground">
                    Your ministry registration has been submitted. A platform administrator will review your request and you'll receive an email once approved.
                  </p>
                  <Button
                    onClick={() => setLocation("/")}
                    className="gap-2"
                    data-testid="button-back-home"
                  >
                    Back to Home
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-6">
                {isPaid || timedOut ? (
                  <>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold" data-testid="text-success-title">Registration Submitted</h2>
                    <p className="text-muted-foreground">
                      Your ministry registration and payment have been received. A platform administrator will review your request and you'll receive an email once approved.
                    </p>
                    {paymentData?.plan && (
                      <p className="text-sm text-muted-foreground">
                        Plan: <span className="font-medium capitalize">{paymentData.plan}</span>
                      </p>
                    )}
                    <Button
                      onClick={() => setLocation("/")}
                      className="gap-2"
                      data-testid="button-back-home"
                    >
                      Back to Home
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : isError ? (
                  <>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 mx-auto">
                      <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Verification Issue</h2>
                    <p className="text-muted-foreground">
                      We had trouble verifying your payment, but don't worry - your registration has been submitted. A platform administrator will review your request shortly.
                    </p>
                    <Button
                      onClick={() => setLocation("/")}
                      className="gap-2"
                      data-testid="button-back-home"
                    >
                      Back to Home
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <h2 className="text-2xl font-bold">Verifying Payment...</h2>
                    <p className="text-muted-foreground">
                      We're confirming your payment. This should only take a moment.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
