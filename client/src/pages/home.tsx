import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Heart, BookOpen, Users, ArrowRight, Sparkles, HandHeart, Church } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-muted py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
                <Sparkles className="h-4 w-4" />
                {t('home.welcomeBadge')}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
                {t('home.heroTitle')}{" "}
                <span className="text-primary">{t('home.heroHighlight')}</span>{" "}
                {t('home.heroTitleEnd')}
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t('home.heroDescription')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                <Link href="/salvation">
                  <Button size="lg" className="gap-2" data-testid="button-learn-more">
                    {t('home.learnAboutSalvation')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-contact">
                    {t('home.requestPrayer')}
                    <HandHeart className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact-us">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2" 
                    data-testid="button-contact-hero"
                  >
                    <Users className="h-4 w-4" />
                    {t('home.contactUs')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('home.pathTitle')}</h2>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                {t('home.pathDescription')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Heart className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t('home.discoverSalvation')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('home.discoverSalvationDesc')}
                  </p>
                  <Link href="/salvation">
                    <Button variant="ghost" className="gap-1" data-testid="link-salvation-card">
                      {t('home.learnMore')} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <BookOpen className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t('home.growInFaith')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('home.growInFaithDesc')}
                  </p>
                  <Link href="/journey">
                    <Button variant="ghost" className="gap-1" data-testid="link-journey-card">
                      {t('home.startJourney')} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t('home.findCommunity')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('home.findCommunityDesc')}
                  </p>
                  <Link href="/contact">
                    <Button variant="ghost" className="gap-1" data-testid="link-contact-card">
                      {t('home.getConnected')} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto overflow-hidden">
              <div className="bg-primary p-8 md:p-12 text-primary-foreground">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <div className="flex-shrink-0">
                    <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                      <Church className="h-10 w-10" />
                    </div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-xl md:text-2xl font-bold mb-2">
                      {t('home.ctaTitle')}
                    </h3>
                    <p className="text-primary-foreground/90 mb-4 md:mb-0">
                      {t('home.ctaDescription')}
                    </p>
                  </div>
                  <Link href="/contact-us">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="whitespace-nowrap"
                      data-testid="button-cta-contact"
                    >
                      {t('home.contactUs')}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
