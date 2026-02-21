import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          <h2 className="text-2xl font-semibold mb-2">{t('common.pageNotFound')}</h2>
          <p className="text-muted-foreground">
            {t('common.pageNotFoundDesc')}
          </p>
        </div>

        <Card>
          <CardContent className="p-6 flex flex-col gap-3">
            <Link href="/">
              <Button className="w-full gap-2" data-testid="button-go-home">
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full gap-2"
              data-testid="button-go-back"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.goBack')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
