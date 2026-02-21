import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { BookOpen, MessageCircle, Users, Droplets, GraduationCap, Heart, ArrowRight } from "lucide-react";

const journeyStepKeys = [
  {
    icon: BookOpen,
    titleKey: "journey.readBible",
    descKey: "journey.readBibleDesc",
    tipKeys: ["journey.readBibleTip1", "journey.readBibleTip2", "journey.readBibleTip3", "journey.readBibleTip4", "journey.readBibleTip5"],
  },
  {
    icon: MessageCircle,
    titleKey: "journey.prayDaily",
    descKey: "journey.prayDailyDesc",
    tipKeys: ["journey.prayDailyTip1", "journey.prayDailyTip2", "journey.prayDailyTip3", "journey.prayDailyTip4", "journey.prayDailyTip5"],
  },
  {
    icon: Users,
    titleKey: "journey.joinCommunity",
    descKey: "journey.joinCommunityDesc",
    tipKeys: ["journey.joinCommunityTip1", "journey.joinCommunityTip2", "journey.joinCommunityTip3", "journey.joinCommunityTip4", "journey.joinCommunityTip5"],
  },
  {
    icon: Droplets,
    titleKey: "journey.getBaptized",
    descKey: "journey.getBaptizedDesc",
    tipKeys: ["journey.getBaptizedTip1", "journey.getBaptizedTip2", "journey.getBaptizedTip3", "journey.getBaptizedTip4", "journey.getBaptizedTip5"],
  },
  {
    icon: GraduationCap,
    titleKey: "journey.growDisciple",
    descKey: "journey.growDiscipleDesc",
    tipKeys: ["journey.growDiscipleTip1", "journey.growDiscipleTip2", "journey.growDiscipleTip3", "journey.growDiscipleTip4", "journey.growDiscipleTip5"],
  },
];

export default function Journey() {
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
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-6">
                {t('journey.pageTitle')}
              </h1>
              <p className="text-base text-muted-foreground">
                {t('journey.pageDescription')}
              </p>
            </div>
          </div>
        </section>

        {/* Journey Steps */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {journeyStepKeys.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <Card key={step.titleKey} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="bg-muted p-6 md:p-8 flex flex-col items-center justify-center md:w-48">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background mb-2">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {t('journey.step', { number: index + 1 })}
                          </span>
                        </div>
                        <div className="flex-1 p-6 md:p-8">
                          <h3 className="text-xl font-bold mb-2">{t(step.titleKey)}</h3>
                          <p className="text-muted-foreground mb-4">{t(step.descKey)}</p>
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              {t('journey.practicalTips')}
                            </h4>
                            <ul className="grid gap-2">
                              {step.tipKeys.map((tipKey) => (
                                <li key={tipKey} className="flex items-start gap-2 text-sm">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{t(tipKey)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Resources Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl md:text-2xl font-bold text-center mb-8">
                {t('journey.recommendedResources')}
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('journey.bibleReadingPlan')}</CardTitle>
                    <CardDescription>
                      {t('journey.bibleReadingPlanDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        {t('journey.bibleBook1')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        {t('journey.bibleBook2')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        {t('journey.bibleBook3')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                        {t('journey.bibleBook4')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
                        {t('journey.bibleBook5')}
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('journey.dailyHabits')}</CardTitle>
                    <CardDescription>
                      {t('journey.dailyHabitsDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">&#10003;</span>
                        <span><strong>{t('journey.morning')}</strong> {t('journey.habitMorning')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">&#10003;</span>
                        <span><strong>{t('journey.throughoutDay')}</strong> {t('journey.habitDay')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">&#10003;</span>
                        <span><strong>{t('journey.evening')}</strong> {t('journey.habitEvening')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">&#10003;</span>
                        <span><strong>{t('journey.weekly')}</strong> {t('journey.habitWeekly')}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl md:text-2xl font-bold mb-4">
                {t('journey.needHelpGettingStarted')}
              </h2>
              <p className="text-muted-foreground mb-8">
                {t('journey.needHelpDesc')}
              </p>
              <Link href="/contact">
                <Button size="lg" className="gap-2" data-testid="button-journey-contact">
                  {t('journey.contactUs')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
