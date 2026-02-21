import { useState } from "react";
import { useLocation } from "wouter";
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

const resetSchemaBase = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
  setupKey: z.string().min(1),
});

type ResetFormData = z.infer<typeof resetSchemaBase>;

export default function AdminReset() {
  const { t } = useTranslation();

  const resetSchema = z.object({
    email: z.string().email(t('validation.invalidEmail')),
    newPassword: z.string().min(8, t('validation.passwordMinLength')),
    confirmPassword: z.string(),
    setupKey: z.string().min(1, t('validation.setupKeyRequired')),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('validation.passwordsDontMatch'),
    path: ["confirmPassword"],
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
      setupKey: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetFormData) => {
      return apiRequest("POST", "/api/auth/admin-reset", {
        email: data.email,
        newPassword: data.newPassword,
        setupKey: data.setupKey,
      });
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: t('adminReset.passwordReset'),
        description: t('adminReset.passwordResetDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('adminReset.resetFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetFormData) => {
    resetMutation.mutate(data);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{t('adminReset.passwordResetSuccessful')}</CardTitle>
            <CardDescription>
              {t('adminReset.passwordResetSuccessfulDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation("/login")}
              data-testid="button-go-to-login"
            >
              {t('adminReset.goToLogin')}
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
          <CardTitle>{t('adminReset.resetAdminPassword')}</CardTitle>
          <CardDescription>
            {t('adminReset.resetDescription')}
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
                    <FormLabel>{t('adminReset.adminEmail')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        data-testid="input-reset-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('adminReset.newPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('adminReset.newPasswordPlaceholder')}
                        data-testid="input-reset-password"
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
                    <FormLabel>{t('settings.confirmPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('adminReset.confirmPasswordPlaceholder')}
                        data-testid="input-reset-confirm-password"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        placeholder={t('setup.setupKeyPlaceholder')}
                        data-testid="input-reset-key"
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
                disabled={resetMutation.isPending}
                data-testid="button-reset-submit"
              >
                {resetMutation.isPending ? t('adminReset.resetting') : t('adminReset.resetPassword')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-back-to-login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('adminReset.backToLogin')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
