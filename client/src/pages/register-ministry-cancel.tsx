import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";

export default function RegisterMinistryCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 mx-auto">
                  <XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold" data-testid="text-cancel-title">Payment Cancelled</h2>
                <p className="text-muted-foreground">
                  Your payment was not completed. Your registration request has been saved. You can try again by re-submitting the registration form.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="gap-2"
                    data-testid="button-back-home"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Button>
                  <Button
                    onClick={() => setLocation("/register-ministry")}
                    className="gap-2"
                    data-testid="button-try-again"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
