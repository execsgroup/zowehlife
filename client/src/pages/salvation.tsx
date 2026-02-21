import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Heart, BookOpen, Cross, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Salvation() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-muted py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Cross className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-6">
                {t('salvation.pageTitle')}
              </h1>
              <p className="text-base text-muted-foreground">
                {t('salvation.pageDescription')}
              </p>
            </div>
          </div>
        </section>

        {/* Gospel Presentation */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-8">
                {/* God's Love */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        1
                      </div>
                      <CardTitle className="text-xl md:text-2xl">{t('salvation.godLovesYou')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {t('salvation.godLovesYouText')}
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      {t('salvation.john316')}
                      <span className="block text-sm text-muted-foreground mt-1">{t('salvation.john316Ref')}</span>
                    </blockquote>
                  </CardContent>
                </Card>

                {/* Sin Separates */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        2
                      </div>
                      <CardTitle className="text-xl md:text-2xl">{t('salvation.weAllHaveSinned')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {t('salvation.weAllHaveSinnedText')}
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      {t('salvation.romans323')}
                      <span className="block text-sm text-muted-foreground mt-1">{t('salvation.romans323Ref')}</span>
                    </blockquote>
                  </CardContent>
                </Card>

                {/* Jesus is the Way */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        3
                      </div>
                      <CardTitle className="text-xl md:text-2xl">{t('salvation.jesusPaidThePrice')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {t('salvation.jesusPaidThePriceText')}
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      {t('salvation.romans58')}
                      <span className="block text-sm text-muted-foreground mt-1">{t('salvation.romans58Ref')}</span>
                    </blockquote>
                  </CardContent>
                </Card>

                {/* Receive Christ */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        4
                      </div>
                      <CardTitle className="text-xl md:text-2xl">{t('salvation.receiveJesusToday')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {t('salvation.receiveJesusTodayText')}
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      {t('salvation.romans109')}
                      <span className="block text-sm text-muted-foreground mt-1">{t('salvation.romans109Ref')}</span>
                    </blockquote>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Prayer Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="overflow-hidden">
                <div className="bg-primary p-6 md:p-8 text-primary-foreground text-center">
                  <Heart className="h-10 w-10 mx-auto mb-4" />
                  <h2 className="text-xl md:text-2xl font-bold">{t('salvation.prayerTitle')}</h2>
                </div>
                <CardContent className="p-6 md:p-8">
                  <p className="text-muted-foreground mb-6">
                    {t('salvation.prayerIntro')}
                  </p>

                  <div className="bg-muted/50 rounded-md p-6 mb-6">
                    <p className="text-lg italic leading-relaxed">
                      {t('salvation.prayerText')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      {t('salvation.ifYouPrayed')}
                    </h4>
                    <p className="text-muted-foreground">
                      {t('salvation.congratulations')}
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">1.</span>
                        {t('salvation.nextStep1')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">2.</span>
                        {t('salvation.nextStep2')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">3.</span>
                        {t('salvation.nextStep3')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">4.</span>
                        {t('salvation.nextStep4')}
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Link href="/journey" className="flex-1">
                      <Button className="w-full gap-2" data-testid="button-next-steps">
                        <BookOpen className="h-4 w-4" />
                        {t('salvation.viewNextSteps')}
                      </Button>
                    </Link>
                    <Link href="/contact" className="flex-1">
                      <Button variant="outline" className="w-full gap-2" data-testid="button-tell-us">
                        {t('salvation.tellUsAboutDecision')}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
