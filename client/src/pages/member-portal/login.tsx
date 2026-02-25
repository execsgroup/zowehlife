import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { memberLoginSchema, type MemberLoginData } from "@shared/schema";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import zowehLogoLight from "@assets/Screenshot_2026-02-24_at_10.38.33_PM_1771990719265.png";
import zowehLogoDark from "@assets/zoweh_logo_dark.png";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MemberLogin() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MemberLoginData>({
    resolver: zodResolver(memberLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: MemberLoginData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/member/login", data);
      queryClient.invalidateQueries({ queryKey: ["/api/member/me"] });
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });
      setLocation("/member-portal");
    } catch (error: any) {
      toast({
        title: t('auth.loginFailed'),
        description: error.message || t('auth.invalidCredentials'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src={zowehLogoLight} alt="Zoweh Life" className="h-14 object-contain dark:hidden" />
            <img src={zowehLogoDark} alt="Zoweh Life" className="h-14 object-contain hidden dark:block" />
          </Link>
          <h1 className="text-2xl font-bold">{t('memberPortal.loginTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('memberPortal.loginDescription')}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{t('auth.signIn')}</CardTitle>
            <CardDescription>
              {t('memberPortal.loginDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            {...field}
                            data-testid="input-member-email"
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
                            placeholder={t('auth.passwordPlaceholder')}
                            className="pl-10"
                            {...field}
                            data-testid="input-member-password"
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
                  disabled={isLoading}
                  data-testid="button-member-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.signingIn')}
                    </>
                  ) : (
                    t('auth.signIn')
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-member-forgot-password">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <div className="mt-3 text-center text-sm">
              <p className="text-muted-foreground">
                {t('memberPortal.firstTimeHere')}{" "}
                <Link href="/member-portal/claim" className="text-primary hover:underline">
                  {t('memberPortal.claimYourAccount')}
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t('memberPortal.backToHome')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
