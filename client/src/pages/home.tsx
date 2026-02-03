import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, BookOpen, Users, ArrowRight, Sparkles, HandHeart, Church, Loader2 } from "lucide-react";

const ministryRequestSchema = z.object({
  ministryName: z.string().min(2, "Ministry name must be at least 2 characters"),
  location: z.string().optional(),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Please enter a valid email"),
  adminPhone: z.string().optional(),
  description: z.string().optional(),
});

type MinistryRequestFormData = z.infer<typeof ministryRequestSchema>;

export default function Home() {
  const [ministryDialogOpen, setMinistryDialogOpen] = useState(false);
  const { toast } = useToast();
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("registerMinistry") === "true") {
      setMinistryDialogOpen(true);
      window.history.replaceState({}, "", "/");
    }
  }, [searchString]);

  const ministryForm = useForm<MinistryRequestFormData>({
    resolver: zodResolver(ministryRequestSchema),
    defaultValues: {
      ministryName: "",
      location: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPhone: "",
      description: "",
    },
  });

  const ministrySubmitMutation = useMutation({
    mutationFn: async (data: MinistryRequestFormData) => {
      await apiRequest("POST", "/api/ministry-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your ministry registration request has been submitted. You will receive an email once it's reviewed.",
      });
      ministryForm.reset();
      setMinistryDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onMinistrySubmit = (data: MinistryRequestFormData) => {
    ministrySubmitMutation.mutate(data);
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
                <Link href="/contact-us">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2" 
                    data-testid="button-contact-hero"
                  >
                    <Users className="h-4 w-4" />
                    Contact Us
                  </Button>
                </Link>
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
                    Connect with a local ministry and fellow believers who will support you.
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
                      with a local ministry, we're here for you.
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

      {/* Ministry Registration Request Dialog */}
      <Dialog open={ministryDialogOpen} onOpenChange={(open) => {
        setMinistryDialogOpen(open);
        if (!open) {
          ministryForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Your Ministry</DialogTitle>
            <DialogDescription>
              Submit a request to register your ministry on Zoweh Life. The platform administrator will review your request.
            </DialogDescription>
          </DialogHeader>
          <Form {...ministryForm}>
            <form onSubmit={ministryForm.handleSubmit(onMinistrySubmit)} className="space-y-4">
              <FormField
                control={ministryForm.control}
                name="ministryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ministry Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Grace Community Church" {...field} data-testid="input-ministry-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ministryForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, State/Country" {...field} data-testid="input-ministry-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ministryForm.control}
                  name="adminFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-ministry-admin-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ministryForm.control}
                  name="adminLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} data-testid="input-ministry-admin-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={ministryForm.control}
                name="adminEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@ministry.org" {...field} data-testid="input-ministry-admin-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ministryForm.control}
                name="adminPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 000-0000" {...field} data-testid="input-ministry-admin-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ministryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About Your Ministry</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your ministry and its mission..."
                        className="resize-none"
                        {...field}
                        data-testid="input-ministry-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={ministrySubmitMutation.isPending}
                data-testid="button-submit-ministry-request"
              >
                {ministrySubmitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Registration Request"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PublicFooter />
    </div>
  );
}
