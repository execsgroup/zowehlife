import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { CheckCircle, ArrowRight, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function RegisterMinistryFreeSuccess() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

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
                <h2 className="text-2xl font-bold" data-testid="text-free-success-title">{t('registerMinistry.freeSuccessTitle')}</h2>
                <p className="text-muted-foreground">
                  {t('registerMinistry.freeSuccessDescription')}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Login credentials sent to your email</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Plan: <span className="font-medium">Free</span>
                </p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="gap-2"
                  data-testid="button-login"
                >
                  {t('registerMinistry.goToLogin')}
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
