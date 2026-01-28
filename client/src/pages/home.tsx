import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, BookOpen, Users, ArrowRight, Sparkles, HandHeart, Church, UserPlus, Loader2 } from "lucide-react";

const leaderRequestSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  churchName: z.string().min(2, "Church name must be at least 2 characters"),
  reason: z.string().optional(),
});

type LeaderRequestFormData = z.infer<typeof leaderRequestSchema>;

export default function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeaderRequestFormData>({
    resolver: zodResolver(leaderRequestSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      churchName: "",
      reason: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: LeaderRequestFormData) => {
      await apiRequest("POST", "/api/account-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your leader account request has been submitted. You will receive an email once it's reviewed.",
      });
      form.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeaderRequestFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
                <Sparkles className="h-4 w-4" />
                Welcome to Your Faith Journey
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Discover the{" "}
                <span className="text-primary">Life Changing Power</span>{" "}
                of Faith
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Begin your spiritual journey today. Whether you're exploring faith for the first time
                or seeking to deepen your relationship with God, we're here to walk alongside you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                <Link href="/salvation">
                  <Button size="lg" className="gap-2" data-testid="button-learn-more">
                    Learn About Salvation
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-contact">
                    Request Prayer
                    <HandHeart className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="gap-2 w-full sm:w-auto" 
                  onClick={() => setDialogOpen(true)}
                  data-testid="button-become-leader-hero"
                >
                  <UserPlus className="h-4 w-4" />
                  Become a Leader
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Path to Spiritual Growth</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every journey begins with a single step. Here's how we can help you grow.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Heart className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Discover Salvation</h3>
                  <p className="text-muted-foreground mb-4">
                    Learn about God's love and the gift of eternal life through Jesus Christ.
                  </p>
                  <Link href="/salvation">
                    <Button variant="ghost" className="gap-1" data-testid="link-salvation-card">
                      Learn More <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 mb-4">
                    <BookOpen className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Grow in Faith</h3>
                  <p className="text-muted-foreground mb-4">
                    Explore resources for Bible reading, prayer, and spiritual development.
                  </p>
                  <Link href="/journey">
                    <Button variant="ghost" className="gap-1" data-testid="link-journey-card">
                      Start Journey <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-chart-3/10 mb-4">
                    <Users className="h-7 w-7 text-chart-3" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Find Community</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect with a local church and fellow believers who will support you.
                  </p>
                  <Link href="/contact">
                    <Button variant="ghost" className="gap-1" data-testid="link-contact-card">
                      Get Connected <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Become a Leader Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4 mx-auto">
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl">Become a Leader</CardTitle>
                <CardDescription className="text-base">
                  Are you a church leader interested in helping track and follow up with new converts?
                  Request access to our leader portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2" data-testid="button-become-leader">
                      <UserPlus className="h-4 w-4" />
                      Request Leader Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Leader Account</DialogTitle>
                      <DialogDescription>
                        Fill out this form to request a leader account. An administrator will review your request.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} data-testid="input-leader-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} data-testid="input-leader-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+1 (555) 000-0000" {...field} data-testid="input-leader-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="churchName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Church Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your church name" {...field} data-testid="input-leader-church" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Why do you want to become a leader? (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about your role in the church..."
                                  className="resize-none"
                                  {...field}
                                  data-testid="input-leader-reason"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitMutation.isPending}
                          data-testid="button-submit-leader-request"
                        >
                          {submitMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Request"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12 text-primary-foreground">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <div className="flex-shrink-0">
                    <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                      <Church className="h-10 w-10" />
                    </div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">
                      Ready to Take the Next Step?
                    </h3>
                    <p className="text-primary-foreground/90 mb-4 md:mb-0">
                      Whether you want to learn more about faith, need prayer, or want to connect
                      with a local church, we're here for you.
                    </p>
                  </div>
                  <Link href="/contact">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="whitespace-nowrap"
                      data-testid="button-cta-contact"
                    >
                      Contact Us
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
