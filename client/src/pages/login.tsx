import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginData } from "@shared/schema";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import zowehLogoLight from "@assets/Screenshot_2026-02-24_at_10.38.33_PM_1771990719265.png";
import zowehLogoDark from "@assets/zoweh_life_logo_transparent_1771993303739.png";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });
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
    <div className="min-h-screen flex items-center justify-center bg-muted p-4 relative">
      <Link href="/" className="absolute top-3 left-3 inline-flex items-center gap-2.5">
        <img src={zowehLogoLight} alt="Zoweh Life" className="h-4 object-contain dark:hidden" />
        <img src={zowehLogoDark} alt="Zoweh Life" className="h-4 object-contain hidden dark:block" />
      </Link>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t('auth.loginTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('auth.loginDescription')}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{t('auth.signIn')}</CardTitle>
            <CardDescription>
              {t('auth.loginDescription')}
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
                            placeholder={t('auth.emailPlaceholder')}
                            className="pl-10"
                            {...field}
                            data-testid="input-login-email"
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
                            data-testid="input-login-password"
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
                  data-testid="button-login-submit"
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

            <div className="mt-6 text-center text-sm space-y-2">
              <div>
                <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-forgot-password">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('nav.backToHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
