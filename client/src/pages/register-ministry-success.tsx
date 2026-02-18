import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { CheckCircle, Loader2, ArrowRight, AlertCircle, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function RegisterMinistrySuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");
  const [confirmed, setConfirmed] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: async (sid: string) => {
      const res = await apiRequest("POST", "/api/ministry-requests/confirm", { sessionId: sid });
      return res.json();
    },
    onSuccess: (data: { plan?: string }) => {
      setConfirmed(true);
      if (data.plan) setPlanName(data.plan);
    },
  });

  useEffect(() => {
    if (sessionId && !confirmed && !confirmMutation.isPending && !confirmMutation.isError) {
      confirmMutation.mutate(sessionId);
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto">
              <Card>
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 mx-auto">
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-2xl font-bold">Missing Payment Information</h2>
                  <p className="text-muted-foreground">
                    We couldn't verify your payment. Please try registering again.
                  </p>
                  <Button
                    onClick={() => setLocation("/register-ministry")}
                    className="gap-2"
                    data-testid="button-try-again"
                  >
                    Try Again
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
                {confirmed ? (
                  <>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold" data-testid="text-success-title">Ministry Created!</h2>
                    <p className="text-muted-foreground">
                      Your payment was successful and your ministry has been created. Check your email for your login credentials to get started.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>Login credentials sent to your email</span>
                    </div>
                    {planName && (
                      <p className="text-sm text-muted-foreground">
                        Plan: <span className="font-medium capitalize">{planName}</span>
                      </p>
                    )}
                    <Button
                      onClick={() => setLocation("/login")}
                      className="gap-2"
                      data-testid="button-login"
                    >
                      Go to Login
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : confirmMutation.isError ? (
                  <>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 mx-auto">
                      <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Verification Issue</h2>
                    <p className="text-muted-foreground">
                      We had trouble confirming your payment. If you were charged, don't worry - please contact us and we'll sort it out.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/")}
                        className="gap-2"
                        data-testid="button-back-home"
                      >
                        Back to Home
                      </Button>
                      <Button
                        onClick={() => confirmMutation.mutate(sessionId)}
                        className="gap-2"
                        data-testid="button-retry"
                      >
                        Retry Verification
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <h2 className="text-2xl font-bold">Setting Up Your Ministry...</h2>
                    <p className="text-muted-foreground">
                      We're verifying your payment and creating your ministry account. This should only take a moment.
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
