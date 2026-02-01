import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, BookOpen, Users, ArrowRight, Sparkles, HandHeart, Church, UserPlus, Loader2 } from "lucide-react";
import type { Church as ChurchType } from "@shared/schema";

const leaderRequestSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  churchId: z.string().min(1, "Please select a ministry"),
  churchName: z.string().min(2, "Ministry name is required"),
  reason: z.string().min(1, "Please tell us about your ministry involvement"),
});

type LeaderRequestFormData = z.infer<typeof leaderRequestSchema>;

const ministryRequestSchema = z.object({
  ministryName: z.string().min(2, "Ministry name must be at least 2 characters"),
  location: z.string().optional(),
  adminFullName: z.string().min(2, "Name must be at least 2 characters"),
  adminEmail: z.string().email("Please enter a valid email"),
  adminPhone: z.string().optional(),
  description: z.string().optional(),
});

type MinistryRequestFormData = z.infer<typeof ministryRequestSchema>;

export default function Home() {
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [ministryDialogOpen, setMinistryDialogOpen] = useState(false);
  const [selectedChurchId, setSelectedChurchId] = useState<string>("");
  const { toast } = useToast();
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("becomeLeader") === "true") {
      setLeaderDialogOpen(true);
      window.history.replaceState({}, "", "/");
    }
    if (params.get("registerMinistry") === "true") {
      setMinistryDialogOpen(true);
      window.history.replaceState({}, "", "/");
    }
  }, [searchString]);

  const { data: churches } = useQuery<ChurchType[]>({
    queryKey: ["/api/public/churches"],
  });

  const leaderForm = useForm<LeaderRequestFormData>({
    resolver: zodResolver(leaderRequestSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      churchId: "",
      churchName: "",
      reason: "",
    },
  });

  const ministryForm = useForm<MinistryRequestFormData>({
    resolver: zodResolver(ministryRequestSchema),
    defaultValues: {
      ministryName: "",
      location: "",
      adminFullName: "",
      adminEmail: "",
      adminPhone: "",
      description: "",
    },
  });

  const leaderSubmitMutation = useMutation({
    mutationFn: async (data: LeaderRequestFormData) => {
      await apiRequest("POST", "/api/account-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your leader account request has been submitted. The ministry admin will review your request.",
      });
      leaderForm.reset();
      setSelectedChurchId("");
      setLeaderDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
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

  const onLeaderSubmit = (data: LeaderRequestFormData) => {
    leaderSubmitMutation.mutate(data);
  };

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

      {/* Leader Account Request Dialog */}
      <Dialog open={leaderDialogOpen} onOpenChange={(open) => {
        setLeaderDialogOpen(open);
        if (!open) {
          setSelectedChurchId("");
          leaderForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leader Account</DialogTitle>
            <DialogDescription>
              Select your registered ministry and submit a request to become a leader. The ministry admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <Form {...leaderForm}>
            <form onSubmit={leaderForm.handleSubmit(onLeaderSubmit)} className="space-y-4">
              <FormField
                control={leaderForm.control}
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
                control={leaderForm.control}
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
                control={leaderForm.control}
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
                control={leaderForm.control}
                name="churchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Your Ministry *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedChurchId(value);
                        const selectedChurch = churches?.find(c => c.id === value);
                        if (selectedChurch) {
                          leaderForm.setValue("churchName", selectedChurch.name);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-church-dropdown">
                          <SelectValue placeholder="Select your ministry..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {churches && churches.length > 0 ? (
                          churches.map((church) => (
                            <SelectItem key={church.id} value={church.id}>
                              {church.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No ministries registered yet</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Don't see your ministry? <a href="/?registerMinistry=true" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); setLeaderDialogOpen(false); setMinistryDialogOpen(true); }}>Register it first</a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leaderForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tell us about your involvement *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your role and involvement in the ministry..."
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
                disabled={leaderSubmitMutation.isPending || !selectedChurchId}
                data-testid="button-submit-leader-request"
              >
                {leaderSubmitMutation.isPending ? (
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
              <FormField
                control={ministryForm.control}
                name="adminFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name (Ministry Admin) *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-ministry-admin-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
