import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Check,
  Users,
  BarChart3,
  Video,
  Mail,
  Sparkles,
  Star,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const ministryRequestSchema = z.object({
  ministryName: z.string().min(2, "Ministry name must be at least 2 characters"),
  location: z.string().optional(),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Please enter a valid email"),
  adminPhone: z.string().optional(),
  description: z.string().optional(),
  plan: z.enum(["free", "foundations", "formation", "stewardship"]).default("foundations"),
});

type MinistryRequestFormData = z.infer<typeof ministryRequestSchema>;

interface StripePlan {
  planId: string;
  productId: string;
  name: string;
  description: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
}

const tierMeta: Record<string, { highlighted: boolean; leaderLimit: string }> = {
  free: { highlighted: false, leaderLimit: "1 Leader Account" },
  foundations: { highlighted: false, leaderLimit: "1 Leader Account" },
  formation: { highlighted: true, leaderLimit: "Up to 3 Leader Accounts" },
  stewardship: { highlighted: false, leaderLimit: "Up to 10 Leader Accounts" },
};

const sharedFeatures = [
  "All Platform Features Included",
  "Convert & Member Tracking",
  "Follow-Up Scheduling & Email Notifications",
  "Public Registration Links",
  "Dashboard Statistics",
  "Prayer Requests & Member Portal",
  "AI Email Drafting & Video Calls",
];

function formatPrice(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

export default function RegisterMinistry() {
  const [step, setStep] = useState<"plan" | "form">("plan");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "foundations" | "formation" | "stewardship" | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: plans, isLoading: plansLoading } = useQuery<StripePlan[]>({
    queryKey: ["/api/stripe/ministry-plans"],
  });

  const form = useForm<MinistryRequestFormData>({
    resolver: zodResolver(ministryRequestSchema),
    defaultValues: {
      ministryName: "",
      location: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPhone: "",
      description: "",
      plan: "foundations",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: MinistryRequestFormData) => {
      const response = await apiRequest("POST", "/api/ministry-requests", data);
      return response.json();
    },
    onSuccess: (data: { checkoutUrl?: string; free?: boolean; message?: string }) => {
      if (data.free) {
        setLocation("/register-ministry/free-success");
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: "free" | "foundations" | "formation" | "stewardship") => {
    setSelectedPlan(planId);
    form.setValue("plan", planId);
    setStep("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = (data: MinistryRequestFormData) => {
    submitMutation.mutate(data);
  };

  const selectedStripePlan = selectedPlan !== "free" ? plans?.find(p => p.planId === selectedPlan) : null;
  const planOrder = ["foundations", "formation", "stewardship"];
  const sortedPlans = plans?.slice().sort((a, b) => planOrder.indexOf(a.planId) - planOrder.indexOf(b.planId));
  const isFreePlan = selectedPlan === "free";

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1">
        <section className="bg-muted py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <Button
              variant="ghost"
              className="mb-6 gap-2"
              onClick={() => {
                if (step === "form") {
                  setStep("plan");
                } else {
                  setLocation("/");
                }
              }}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === "form" ? "Back to Plans" : "Back to Home"}
            </Button>
            {step === "plan" ? (
              <>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                  Choose a Plan to{" "}
                  <span className="text-primary">Start Your Ministry</span>
                </h1>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  {t('registerMinistry.pageDescription')}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                  {t('registerMinistry.pageTitle')}
                </h1>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  {isFreePlan
                    ? "Fill out the details below to register your ministry for free."
                    : "Fill out the details below. After submitting, you'll be directed to complete payment."}
                </p>
              </>
            )}
          </div>
        </section>

        {step === "plan" && (
          <>
            <section className="py-12 md:py-20">
              <div className="container mx-auto px-4">
                {plansLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    <Card
                      className="relative flex flex-col transition-shadow duration-200"
                      data-testid="card-plan-free"
                    >
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl">Free</CardTitle>
                        <div className="mt-2">
                          <span className="text-3xl font-bold">$0</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Get started at no cost</p>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <Button
                          className="w-full mb-6 gap-2"
                          variant="outline"
                          onClick={() => handleSelectPlan("free")}
                          data-testid="button-select-free"
                        >
                          Get Started
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <ul className="space-y-3 flex-1">
                          <li className="flex items-start gap-2 text-sm font-medium">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>1 Admin Account</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm font-medium">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>1 Leader Account</span>
                          </li>
                          {sharedFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    {(sortedPlans || []).map((plan) => {
                      const meta = tierMeta[plan.planId];
                      if (!meta) return null;
                      return (
                        <Card
                          key={plan.planId}
                          className={`relative flex flex-col transition-shadow duration-200 ${
                            meta.highlighted
                              ? "border-primary shadow-lg ring-2 ring-primary/20"
                              : ""
                          }`}
                          data-testid={`card-plan-${plan.planId}`}
                        >
                          {meta.highlighted && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <Badge className="gap-1 bg-primary text-primary-foreground">
                                <Star className="h-3 w-3" />
                                Most Popular
                              </Badge>
                            </div>
                          )}
                          <CardHeader className="text-center pb-2">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <div className="mt-2">
                              <span className="text-3xl font-bold">{formatPrice(plan.amount)}</span>
                              <span className="text-muted-foreground">/{plan.interval}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <Button
                              className="w-full mb-6 gap-2"
                              variant={meta.highlighted ? "default" : "outline"}
                              onClick={() => handleSelectPlan(plan.planId as "free" | "foundations" | "formation" | "stewardship")}
                              data-testid={`button-select-${plan.planId}`}
                            >
                              Get Started
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <ul className="space-y-3 flex-1">
                              <li className="flex items-start gap-2 text-sm font-medium">
                                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <span>1 Admin Account</span>
                              </li>
                              <li className="flex items-start gap-2 text-sm font-medium">
                                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <span>{meta.leaderLimit}</span>
                              </li>
                              {sharedFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="py-12 md:py-16 bg-muted/30">
              <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">What Every Ministry Gets</h2>
                  <p className="text-muted-foreground">
                    All tiers include the core tools you need to manage and grow your ministry.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                  {[
                    { icon: Users, title: "Member Tracking", desc: "Track converts, new members, and existing members in one place" },
                    { icon: Mail, title: "Email Notifications", desc: "Automated follow-up reminders and status updates" },
                    { icon: BarChart3, title: "Dashboard Analytics", desc: "At-a-glance statistics about your ministry's growth" },
                    { icon: Video, title: "Video Conferencing", desc: "Built-in video call links for remote follow-ups" },
                  ].map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <Card key={idx} className="text-center">
                        <CardContent className="pt-6">
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                            <ItemIcon className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="font-semibold mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {step === "form" && selectedPlan && (
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Selected Plan:</span>
                    <Badge variant="secondary" className="gap-1" data-testid="badge-selected-plan">
                      <Sparkles className="h-3 w-3" />
                      {isFreePlan ? "Free" : (selectedStripePlan?.name || selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1))}
                    </Badge>
                    {isFreePlan ? (
                      <Badge variant="outline" data-testid="badge-plan-price">
                        $0/month
                      </Badge>
                    ) : selectedStripePlan && (
                      <Badge variant="outline" data-testid="badge-plan-price">
                        {formatPrice(selectedStripePlan.amount)}/{selectedStripePlan.interval}
                      </Badge>
                    )}
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
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
                          control={form.control}
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
                            control={form.control}
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
                            control={form.control}
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
                          control={form.control}
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
                          control={form.control}
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
                          control={form.control}
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
                        <input type="hidden" {...form.register("plan")} />

                        {!isFreePlan && (
                          <div className="border rounded-md p-4 bg-muted/30 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <CreditCard className="h-4 w-4 text-primary" />
                              <span>Payment Information</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              After submitting, you'll be securely redirected to Stripe to complete your {selectedStripePlan ? formatPrice(selectedStripePlan.amount) + "/" + selectedStripePlan.interval : ""} subscription payment.
                            </p>
                          </div>
                        )}

                        {isFreePlan && (
                          <div className="border rounded-md p-4 bg-muted/30 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Check className="h-4 w-4 text-primary" />
                              <span>No Payment Required</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              The Free plan requires no payment. Your registration will be submitted for admin review.
                            </p>
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full gap-2"
                          disabled={submitMutation.isPending}
                          data-testid="button-submit-ministry-request"
                        >
                          {submitMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : isFreePlan ? (
                            <>
                              Submit Registration
                              <ArrowRight className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Continue to Payment
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
