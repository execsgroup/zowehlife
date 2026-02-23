import { useState } from "react";
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
import { Heart, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

type ForgotPasswordData = { email: string };

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const forgotSchema = z.object({
    email: z.string().email(t('validation.invalidEmail')),
  });

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return apiRequest("POST", "/api/auth/forgot-password", { email: data.email });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle data-testid="text-check-email">{t('forgotPassword.checkEmail')}</CardTitle>
            <CardDescription>
              {t('forgotPassword.checkEmailDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full" data-testid="button-back-to-login">
                  {t('forgotPassword.backToLogin')}
                </Button>
              </Link>
              <Link href="/member-portal/login">
                <Button variant="outline" className="w-full" data-testid="button-member-login">
                  {t('forgotPassword.memberLogin')}
                </Button>
              </Link>
            </div>
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
          <CardTitle>{t('forgotPassword.title')}</CardTitle>
          <CardDescription>
            {t('forgotPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forgotPassword.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('forgotPassword.emailPlaceholder')}
                        data-testid="input-forgot-email"
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
                data-testid="button-send-reset"
              >
                {mutation.isPending ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-back-to-login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('forgotPassword.backToLogin')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
