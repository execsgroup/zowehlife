import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApiBasePath } from "@/hooks/use-api-base-path";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Image } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface SmsUsageData {
  billingPeriod: string;
  plan: string;
  smsUsed: number;
  mmsUsed: number;
  smsLimit: number;
  mmsLimit: number;
  smsRemaining: number;
  mmsRemaining: number;
}

interface NotificationMethodSelectorProps {
  form: UseFormReturn<any>;
  fieldName?: string;
  hasPhone?: boolean;
}

export function NotificationMethodSelector({
  form,
  fieldName = "notificationMethod",
  hasPhone = false,
}: NotificationMethodSelectorProps) {
  const { t } = useTranslation();
  const apiBasePath = useApiBasePath();

  const { data: smsUsage } = useQuery<SmsUsageData>({
    queryKey: [apiBasePath, "sms-usage"],
    queryFn: async () => {
      const res = await fetch(`${apiBasePath}/sms-usage`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch SMS usage");
      return res.json();
    },
  });

  const isFree = smsUsage?.plan === "free";
  const smsAvailable = (smsUsage?.smsRemaining ?? 0) > 0;
  const mmsAvailable = (smsUsage?.mmsRemaining ?? 0) > 0;

  return (
    <div className="space-y-2">
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('followUps.notificationMethod')}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || "email"}
              data-testid="select-notification-method"
            >
              <FormControl>
                <SelectTrigger data-testid="trigger-notification-method">
                  <SelectValue placeholder={t('followUps.selectNotificationMethod')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="email" data-testid="option-email">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('followUps.emailOnly')}
                  </span>
                </SelectItem>
                <SelectItem
                  value="sms"
                  disabled={isFree || !smsAvailable || !hasPhone}
                  data-testid="option-sms"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                    {t('followUps.emailSms')}
                    {isFree && (
                      <Badge variant="secondary" className="text-xs">
                        {t('followUps.upgrade')}
                      </Badge>
                    )}
                    {!isFree && !smsAvailable && (
                      <Badge variant="destructive" className="text-xs">
                        {t('followUps.limitReached')}
                      </Badge>
                    )}
                    {!hasPhone && !isFree && (
                      <Badge variant="secondary" className="text-xs">
                        {t('followUps.noPhone')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem
                  value="mms"
                  disabled={isFree || !mmsAvailable || !hasPhone}
                  data-testid="option-mms"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Image className="h-4 w-4" />
                    {t('followUps.emailMms')}
                    {isFree && (
                      <Badge variant="secondary" className="text-xs">
                        {t('followUps.upgrade')}
                      </Badge>
                    )}
                    {!isFree && !mmsAvailable && (
                      <Badge variant="destructive" className="text-xs">
                        {t('followUps.limitReached')}
                      </Badge>
                    )}
                    {!hasPhone && !isFree && (
                      <Badge variant="secondary" className="text-xs">
                        {t('followUps.noPhone')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {smsUsage && !isFree && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" data-testid="text-sms-usage">
          <span>{t('followUps.smsRemainingCount', { remaining: smsUsage.smsRemaining, limit: smsUsage.smsLimit })}</span>
          <span>{t('followUps.mmsRemainingCount', { remaining: smsUsage.mmsRemaining, limit: smsUsage.mmsLimit })}</span>
        </div>
      )}

      {isFree && (
        <p className="text-xs text-muted-foreground" data-testid="text-sms-upgrade-hint">
          {t('followUps.smsMmsPaidPlans')}
        </p>
      )}
    </div>
  );
}
