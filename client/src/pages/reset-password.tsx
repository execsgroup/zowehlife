import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, ArrowLeft, KeyRound } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

type ResetPasswordData = { newPassword: string; confirmPassword: string };

export default function ResetPassword() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [success, setSuccess] = useState(false);

  const params = new URLSearchParams(search);
  const token = params.get("token");
  const accountType = params.get("type") as "staff" | "member" | null;

  const resetSchema = z.object({
    newPassword: z.string().min(8, t('validation.passwordMinLength')),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('validation.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      return apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
        accountType,
      });
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: t('resetPassword.passwordReset'),
        description: t('resetPassword.passwordResetDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('resetPassword.resetFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!token || !accountType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t('resetPassword.invalidLink')}</CardTitle>
            <CardDescription>
              {t('resetPassword.invalidLinkDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full" data-testid="button-request-new-reset">
                {t('resetPassword.requestNewLink')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    const loginPath = accountType === "member" ? "/member-portal/login" : "/login";
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle data-testid="text-reset-success">{t('resetPassword.passwordReset')}</CardTitle>
            <CardDescription>
              {t('resetPassword.passwordResetDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation(loginPath)}
              data-testid="button-go-to-login"
            >
              {t('resetPassword.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t('resetPassword.title')}</CardTitle>
          <CardDescription>
            {t('resetPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('resetPassword.newPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('resetPassword.newPasswordPlaceholder')}
                        data-testid="input-new-password"
                        {...field}
                      />
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
                    <FormLabel>{t('resetPassword.confirmPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                        data-testid="input-confirm-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-reset-submit"
              >
                {mutation.isPending ? t('resetPassword.resetting') : t('resetPassword.resetPassword')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-back-to-login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('resetPassword.backToLogin')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
