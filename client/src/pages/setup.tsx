import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { adminSetupSchema, type AdminSetupData } from "@shared/schema";
import { User, Mail, Lock, Key, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import zowehLogoPath from "@assets/ChatGPT_Image_Feb_24,_2026,_10_13_39_PM_1771989231984.png";
import { useTranslation } from "react-i18next";

export default function Setup() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const localSetupSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(8, t('validation.passwordMinLength')),
    setupKey: z.string().min(1, t('validation.setupKeyRequired')),
  });

  const { data: setupStatus, isLoading: checkingSetup } = useQuery<{ available: boolean }>({
    queryKey: ["/api/auth/setup-status"],
    retry: false,
  });

  const form = useForm<AdminSetupData>({
    resolver: zodResolver(localSetupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
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
        title: t('setup.adminAccountCreated'),
        description: t('setup.adminAccountCreatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/setup-status"] });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: t('setup.setupFailed'),
        description: error.message || t('setup.setupFailedDesc'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminSetupData) => {
    mutation.mutate(data);
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('setup.checkingSetup')}</span>
        </div>
      </div>
    );
  }

  if (setupStatus && !setupStatus.available) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('setup.setupComplete')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('setup.setupCompleteDesc')}
              </p>
              <Link href="/login">
                <Button data-testid="button-go-login">{t('setup.goToLogin')}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src={zowehLogoPath} alt="Zoweh Life" className="h-10 object-contain dark:invert dark:brightness-200 transition-[filter] duration-300" />
          </Link>
          <h1 className="text-2xl font-bold">{t('setup.adminSetup')}</h1>
          <p className="text-muted-foreground mt-1">{t('setup.createFirstAdmin')}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{t('setup.createAdminAccount')}</CardTitle>
            <CardDescription>
              {t('setup.useSetupKey')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-md p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {t('setup.setupWarning')}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.firstName')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={t('forms.firstNameShort')}
                              className="pl-10"
                              {...field}
                              data-testid="input-setup-first-name"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.lastName')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('forms.lastNameShort')}
                            {...field}
                            data-testid="input-setup-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.email')}</FormLabel>
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
                      <FormLabel>{t('auth.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder={t('setup.passwordPlaceholder')}
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
                      <FormLabel>{t('setup.setupKey')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder={t('setup.setupKeyPlaceholder')}
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
                      {t('setup.creatingAccount')}
                    </>
                  ) : (
                    t('setup.createAdminAccount')
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
              {t('setup.backToHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
