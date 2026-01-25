import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Heart, BookOpen, Cross, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Salvation() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Cross className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                The Gift of Salvation
              </h1>
              <p className="text-lg text-muted-foreground">
                God loves you and has a wonderful plan for your life. Discover how you can
                experience His love, forgiveness, and eternal life.
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-1/10 text-chart-1 font-bold">
                        1
                      </div>
                      <CardTitle className="text-xl md:text-2xl">God Loves You</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      God created you and loves you deeply. He desires a personal relationship with you.
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      "For God so loved the world that he gave his one and only Son, that whoever
                      believes in him shall not perish but have eternal life."
                      <span className="block text-sm text-muted-foreground mt-1">— John 3:16</span>
                    </blockquote>
                  </CardContent>
                </Card>

                {/* Sin Separates */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-2/10 text-chart-2 font-bold">
                        2
                      </div>
                      <CardTitle className="text-xl md:text-2xl">We All Have Sinned</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Every person has sinned and fallen short of God's perfect standard. This sin
                      separates us from God.
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      "For all have sinned and fall short of the glory of God."
                      <span className="block text-sm text-muted-foreground mt-1">— Romans 3:23</span>
                    </blockquote>
                  </CardContent>
                </Card>

                {/* Jesus is the Way */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-3/10 text-chart-3 font-bold">
                        3
                      </div>
                      <CardTitle className="text-xl md:text-2xl">Jesus Paid the Price</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Jesus Christ, God's Son, died on the cross to pay the penalty for our sins
                      and rose again, conquering death.
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      "But God demonstrates his own love for us in this: While we were still
                      sinners, Christ died for us."
                      <span className="block text-sm text-muted-foreground mt-1">— Romans 5:8</span>
                    </blockquote>
                  </CardContent>
                </Card>

                {/* Receive Christ */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-4/10 text-chart-4 font-bold">
                        4
                      </div>
                      <CardTitle className="text-xl md:text-2xl">Receive Jesus Today</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Salvation is a free gift. By believing in Jesus and accepting Him as your
                      Lord and Savior, you can receive eternal life.
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
                      "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart
                      that God raised him from the dead, you will be saved."
                      <span className="block text-sm text-muted-foreground mt-1">— Romans 10:9</span>
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
                  <h2 className="text-2xl md:text-3xl font-bold">A Prayer for Salvation</h2>
                </div>
                <CardContent className="p-6 md:p-8">
                  <p className="text-muted-foreground mb-6">
                    If you're ready to accept Jesus as your Lord and Savior, you can pray this
                    prayer from your heart:
                  </p>

                  <div className="bg-muted/50 rounded-lg p-6 mb-6">
                    <p className="text-lg italic leading-relaxed">
                      "Dear God, I know that I am a sinner and I need Your forgiveness. I believe
                      that Jesus Christ died for my sins and rose from the dead. I turn from my sins
                      and invite Jesus to come into my heart and life. I want to trust and follow
                      Jesus as my Lord and Savior. In Jesus' name, Amen."
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-chart-3" />
                      If You Prayed This Prayer
                    </h4>
                    <p className="text-muted-foreground">
                      Congratulations on the most important decision of your life! Here are your
                      next steps:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">1.</span>
                        Tell someone about your decision
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">2.</span>
                        Start reading the Bible (begin with the book of John)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">3.</span>
                        Find a local church to connect with
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">4.</span>
                        Learn about baptism as your next step
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Link href="/journey" className="flex-1">
                      <Button className="w-full gap-2" data-testid="button-next-steps">
                        <BookOpen className="h-4 w-4" />
                        View Next Steps
                      </Button>
                    </Link>
                    <Link href="/contact" className="flex-1">
                      <Button variant="outline" className="w-full gap-2" data-testid="button-tell-us">
                        Tell Us About Your Decision
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
