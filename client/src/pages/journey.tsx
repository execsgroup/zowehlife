import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { BookOpen, MessageCircle, Users, Droplets, GraduationCap, Heart, ArrowRight } from "lucide-react";

const journeySteps = [
  {
    icon: BookOpen,
    title: "Read the Bible",
    description: "God's Word is your guide for life. Start with the Gospel of John to learn about Jesus.",
    tips: [
      "Set aside 15-20 minutes daily for reading",
      "Start with the Gospel of John, then read Acts",
      "Use a modern translation like NIV or ESV",
      "Take notes and highlight meaningful verses",
      "Consider joining a Bible study group",
    ],
    color: "chart-1",
  },
  {
    icon: MessageCircle,
    title: "Pray Daily",
    description: "Prayer is your direct line to God. Talk to Him like you would a loving Father.",
    tips: [
      "Start each day with prayer",
      "Thank God for His blessings",
      "Share your concerns and needs with Him",
      "Pray for others",
      "Listen for God's guidance",
    ],
    color: "chart-2",
  },
  {
    icon: Users,
    title: "Join a Community",
    description: "Faith is meant to be lived in community. Find a local church to connect with.",
    tips: [
      "Attend Sunday services regularly",
      "Join a small group or life group",
      "Serve others using your gifts",
      "Build friendships with fellow believers",
      "Be open to mentorship",
    ],
    color: "chart-3",
  },
  {
    icon: Droplets,
    title: "Get Baptized",
    description: "Baptism is a public declaration of your faith and an important step of obedience.",
    tips: [
      "Speak with a pastor about baptism",
      "Understand its significance as a symbol",
      "Invite friends and family to witness",
      "Share your testimony",
      "Celebrate this milestone",
    ],
    color: "chart-4",
  },
  {
    icon: GraduationCap,
    title: "Grow as a Disciple",
    description: "Discipleship is a lifelong journey of becoming more like Jesus every day.",
    tips: [
      "Take classes at your local church",
      "Find a mentor or accountability partner",
      "Share your faith with others",
      "Serve in ministry",
      "Develop spiritual disciplines",
    ],
    color: "chart-5",
  },
];

export default function Journey() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-accent/10 via-background to-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-6">
                <Heart className="h-8 w-8 text-accent" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Your New Believer Journey
              </h1>
              <p className="text-lg text-muted-foreground">
                Congratulations on your decision to follow Jesus! This is the beginning of an
                amazing adventure. Here's a roadmap to help you grow in your faith.
              </p>
            </div>
          </div>
        </section>

        {/* Journey Steps */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {journeySteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <Card key={step.title} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className={`bg-${step.color}/10 p-6 md:p-8 flex flex-col items-center justify-center md:w-48`}>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background mb-2">
                            <Icon className={`h-6 w-6 text-${step.color}`} />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Step {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 p-6 md:p-8">
                          <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                          <p className="text-muted-foreground mb-4">{step.description}</p>
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Practical Tips
                            </h4>
                            <ul className="grid gap-2">
                              {step.tips.map((tip) => (
                                <li key={tip} className="flex items-start gap-2 text-sm">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{tip}</span>
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
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Recommended Resources
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="hover-elevate">
                  <CardHeader>
                    <CardTitle className="text-lg">Bible Reading Plan</CardTitle>
                    <CardDescription>
                      Start with these books of the Bible
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Gospel of John - Who is Jesus?
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Acts - The early church
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Romans - Foundations of faith
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                        Psalms - Prayer and worship
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
                        Proverbs - Wisdom for life
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Habits</CardTitle>
                    <CardDescription>
                      Build these spiritual disciplines
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-chart-3 mt-0.5">✓</span>
                        <span><strong>Morning:</strong> Start with prayer and Bible reading</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-chart-3 mt-0.5">✓</span>
                        <span><strong>Throughout day:</strong> Practice gratitude and thankfulness</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-chart-3 mt-0.5">✓</span>
                        <span><strong>Evening:</strong> Reflect on your day with God</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-chart-3 mt-0.5">✓</span>
                        <span><strong>Weekly:</strong> Attend church and connect with believers</span>
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
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Need Help Getting Started?
              </h2>
              <p className="text-muted-foreground mb-8">
                We'd love to connect you with a local church and help you take your next steps
                in faith. Reach out to us!
              </p>
              <Link href="/contact">
                <Button size="lg" className="gap-2" data-testid="button-journey-contact">
                  Contact Us
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
