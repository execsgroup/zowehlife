import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CONTENT_MAX = "max-w-3xl";
const SECTION_PY = "py-20 md:py-24";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className={SECTION_PY}>
          <div className="container mx-auto px-4 sm:px-6">
            <div className={`${CONTENT_MAX} mx-auto text-center`}>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
                {t("home.welcomeBadge")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl mb-6">
                {t("home.heroTitle")}{" "}
                <span className="text-primary">{t("home.heroHighlight")}</span>{" "}
                {t("home.heroTitleEnd")}
              </h1>
              <p className="text-base text-muted-foreground md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                {t("home.heroDescription")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Link href="/salvation">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="button-learn-more">
                    {t("home.learnAboutSalvation")}
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                    data-testid="button-contact"
                  >
                    {t("home.requestPrayer")}
                  </Button>
                </Link>
                <Link href="/contact-us">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                    data-testid="button-contact-hero"
                  >
                    {t("home.contactUs")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className={`${SECTION_PY} border-t bg-muted/40`}>
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl mb-3">
                {t("home.pathTitle")}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                {t("home.pathDescription")}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              <Card className="border-border/80 bg-card text-left transition-shadow hover:shadow-md">
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("home.discoverSalvation")}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    {t("home.discoverSalvationDesc")}
                  </p>
                  <Link href="/salvation">
                    <Button variant="ghost" size="sm" className="gap-1 -ml-2" data-testid="link-salvation-card">
                      {t("home.learnMore")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card text-left transition-shadow hover:shadow-md">
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("home.growInFaith")}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    {t("home.growInFaithDesc")}
                  </p>
                  <Link href="/journey">
                    <Button variant="ghost" size="sm" className="gap-1 -ml-2" data-testid="link-journey-card">
                      {t("home.startJourney")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card text-left transition-shadow hover:shadow-md">
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("home.findCommunity")}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    {t("home.findCommunityDesc")}
                  </p>
                  <Link href="/contact">
                    <Button variant="ghost" size="sm" className="gap-1 -ml-2" data-testid="link-contact-card">
                      {t("home.getConnected")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={SECTION_PY}>
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <Card className="border-border/80 overflow-hidden">
                <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 bg-muted/50 h-full">
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl mb-2">
                      {t("home.ctaTitle")}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base">
                      {t("home.ctaDescription")}
                    </p>
                  </div>
                  <Link href="/contact-us" className="shrink-0">
                    <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-contact">
                      {t("home.contactUs")}
                    </Button>
                  </Link>
                </div>
              </Card>
              <Card className="border-border/80 overflow-hidden">
                <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 bg-muted/50 h-full">
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl mb-2">
                      {t("home.ctaMinistryTitle")}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base">
                      {t("home.ctaMinistryDescription")}
                    </p>
                  </div>
                  <Link href="/register-ministry" className="shrink-0">
                    <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-ministry">
                      {t("home.ctaMinistryButton")}
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
