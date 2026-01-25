import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { adminSetupSchema, type AdminSetupData } from "@shared/schema";
import { Heart, User, Mail, Lock, Key, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function Setup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: setupStatus, isLoading: checkingSetup } = useQuery<{ available: boolean }>({
    queryKey: ["/api/auth/setup-status"],
    retry: false,
  });

  const form = useForm<AdminSetupData>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      setupKey: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AdminSetupData) => {
      await apiRequest("POST", "/api/auth/setup", data);
    },
    onSuccess: () => {
      toast({
        title: "Admin account created!",
        description: "You can now log in with your credentials.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/setup-status"] });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to create admin account. Please check your setup key.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminSetupData) => {
    mutation.mutate(data);
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking setup status...</span>
        </div>
      </div>
    );
  }

  if (setupStatus && !setupStatus.available) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <div className="w-full max-w-md">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-chart-3/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-chart-3" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Setup Complete</h2>
              <p className="text-muted-foreground mb-6">
                An admin account has already been created. You can log in using your admin credentials.
              </p>
              <Link href="/login">
                <Button data-testid="button-go-login">Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-6 w-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Admin Setup</h1>
          <p className="text-muted-foreground mt-1">Create your first admin account</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Create Admin Account</CardTitle>
            <CardDescription>
              Use the setup key from your environment to create the first administrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                This setup page will be disabled after the first admin account is created. Make sure
                to remember your credentials.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter your full name"
                            className="pl-10"
                            {...field}
                            data-testid="input-setup-name"
                          />
                        </div>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="admin@example.com"
                            className="pl-10"
                            {...field}
                            data-testid="input-setup-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Minimum 8 characters"
                            className="pl-10"
                            {...field}
                            data-testid="input-setup-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="setupKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Key</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Enter ADMIN_SETUP_KEY"
                            className="pl-10"
                            {...field}
                            data-testid="input-setup-key"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                  data-testid="button-setup-submit"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Admin Account"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
