import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { claimAccountSchema, type ClaimAccountData } from "@shared/schema";
import { Key, Lock, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import zowehLogoPath from "@assets/zoweh_logo_2_1771985257647.png";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

export default function ClaimAccount() {
  const { t } = useTranslation();

  const claimFormSchema = claimAccountSchema.extend({
    confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  type ClaimFormData = z.infer<typeof claimFormSchema>;
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const params = new URLSearchParams(searchString);
  const tokenFromUrl = params.get("token") || "";

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ClaimFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/member/claim", {
        token: data.token,
        password: data.password,
      });
      setClaimed(true);
      toast({
        title: t('memberPortal.accountClaimed'),
        description: t('memberPortal.accountClaimedShort'),
      });
    } catch (error: any) {
      toast({
        title: t('memberPortal.claimFailed'),
        description: error.message || t('memberPortal.claimFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{t('memberPortal.accountClaimed')}</h2>
                <p className="text-muted-foreground">
                  {t('memberPortal.accountClaimedDesc')}
                </p>
                <Button onClick={() => setLocation("/member-portal/login")} className="w-full" data-testid="button-go-to-login">
                  {t('auth.signIn')}
                </Button>
              </div>
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
            <img src={zowehLogoPath} alt="Zoweh" className="h-12 w-12 object-contain mix-blend-multiply dark:rounded-md dark:bg-white/90 dark:p-0.5" />
          </Link>
          <h1 className="text-2xl font-bold">{t('memberPortal.claimAccountTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('memberPortal.claimAccountDescription')}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{t('memberPortal.setYourPassword')}</CardTitle>
            <CardDescription>
              {t('memberPortal.enterTokenCreatePassword')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('memberPortal.claimToken')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('memberPortal.tokenPlaceholder')}
                            className="pl-10"
                            {...field}
                            data-testid="input-claim-token"
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
                            placeholder={t('memberPortal.createPasswordPlaceholder')}
                            className="pl-10"
                            {...field}
                            data-testid="input-claim-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.confirmPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder={t('memberPortal.confirmPasswordPlaceholder')}
                            className="pl-10"
                            {...field}
                            data-testid="input-claim-confirm-password"
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
                  data-testid="button-claim-account"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('memberPortal.claimingAccount')}
                    </>
                  ) : (
                    t('memberPortal.claimAccount')
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                {t('memberPortal.alreadyHaveAccount')}{" "}
                <Link href="/member-portal/login" className="text-primary hover:underline">
                  {t('auth.signIn')}
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
