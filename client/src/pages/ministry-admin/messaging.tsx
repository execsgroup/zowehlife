import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AITextarea } from "@/components/ai-text-helper";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, UserPlus, Church, Users } from "lucide-react";

type MessagingCategory = "convert" | "member" | "new_member_guest";

interface MessagingConfig {
  id: string;
  churchId: string;
  category: string;
  enabled: string;
  cutoffTime: string | null;
  delayHoursSameDay: number | null;
  nextDaySendTime: string | null;
  sendEmail: string;
  sendSms: string;
  emailSubject: string | null;
  emailBody: string | null;
  smsBody: string | null;
  updatedAt: string;
}

interface MessagingAutomationData {
  convert: MessagingConfig | null;
  member: MessagingConfig | null;
  new_member_guest: MessagingConfig | null;
}

function toBool(s: string | undefined): boolean {
  return s === "true";
}

function CategoryForm({
  category,
  categoryLabel,
  config,
  onSave,
  isSaving,
  t,
}: {
  category: MessagingCategory;
  categoryLabel: string;
  config: MessagingConfig | null;
  onSave: (payload: Record<string, unknown>) => void;
  isSaving: boolean;
  t: (key: string) => string;
}) {
  const enabled = config ? toBool(config.enabled) : false;
  const cutoffTime = config?.cutoffTime ?? "15:00";
  const delayHoursSameDay = config?.delayHoursSameDay ?? 2;
  const nextDaySendTime = config?.nextDaySendTime ?? "12:00";
  const sendEmail = config ? toBool(config.sendEmail) : true;
  const sendSms = config ? toBool(config.sendSms) : false;
  const emailSubject = config?.emailSubject ?? "";
  const emailBody = config?.emailBody ?? "";
  const smsBody = config?.smsBody ?? "";

  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localCutoffTime, setLocalCutoffTime] = useState(cutoffTime);
  const [localDelayHours, setLocalDelayHours] = useState(String(delayHoursSameDay));
  const [localNextDayTime, setLocalNextDayTime] = useState(nextDaySendTime);
  const [localSendEmail, setLocalSendEmail] = useState(sendEmail);
  const [localSendSms, setLocalSendSms] = useState(sendSms);
  const [localEmailSubject, setLocalEmailSubject] = useState(emailSubject);
  const [localEmailBody, setLocalEmailBody] = useState(emailBody);
  const [localSmsBody, setLocalSmsBody] = useState(smsBody);

  useEffect(() => {
    setLocalEnabled(enabled);
    setLocalCutoffTime(cutoffTime);
    setLocalDelayHours(String(delayHoursSameDay));
    setLocalNextDayTime(nextDaySendTime);
    setLocalSendEmail(sendEmail);
    setLocalSendSms(sendSms);
    setLocalEmailSubject(emailSubject);
    setLocalEmailBody(emailBody);
    setLocalSmsBody(smsBody);
  }, [enabled, cutoffTime, delayHoursSameDay, nextDaySendTime, sendEmail, sendSms, emailSubject, emailBody, smsBody]);

  const handleSave = () => {
    onSave({
      category,
      enabled: localEnabled,
      cutoffTime: localCutoffTime || null,
      delayHoursSameDay: parseInt(localDelayHours, 10) || 0,
      nextDaySendTime: localNextDayTime || null,
      sendEmail: localSendEmail,
      sendSms: localSendSms,
      emailSubject: localEmailSubject || null,
      emailBody: localEmailBody || null,
      smsBody: localSmsBody || null,
    });
  };

  return (
    <Section
      title={categoryLabel}
      description={t('messaging.automationDescription')}
      actions={
        <Button onClick={handleSave} disabled={isSaving} data-testid={`button-save-${category}`}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('common.save')}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor={`enabled-${category}`}>{t('messaging.enableAutomation')}</Label>
          <Switch
            id={`enabled-${category}`}
            checked={localEnabled}
            onCheckedChange={setLocalEnabled}
            data-testid={`switch-enabled-${category}`}
          />
        </div>

        <p className="text-sm text-muted-foreground">{t('messaging.timeRulesHelp')}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`cutoff-${category}`}>{t('messaging.cutoffTime')}</Label>
            <Input
              id={`cutoff-${category}`}
              type="time"
              value={localCutoffTime}
              onChange={(e) => setLocalCutoffTime(e.target.value)}
              data-testid={`input-cutoff-${category}`}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('messaging.cutoffTimeHelp')}</p>
          </div>
          <div>
            <Label htmlFor={`delay-${category}`}>{t('messaging.delayHoursSameDay')}</Label>
            <Input
              id={`delay-${category}`}
              type="number"
              min={0}
              max={24}
              value={localDelayHours}
              onChange={(e) => setLocalDelayHours(e.target.value)}
              data-testid={`input-delay-${category}`}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('messaging.delayHoursHelp')}</p>
          </div>
          <div>
            <Label htmlFor={`nextday-${category}`}>{t('messaging.nextDaySendTime')}</Label>
            <Input
              id={`nextday-${category}`}
              type="time"
              value={localNextDayTime}
              onChange={(e) => setLocalNextDayTime(e.target.value)}
              data-testid={`input-nextday-${category}`}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('messaging.nextDaySendTimeHelp')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id={`send-email-${category}`}
              checked={localSendEmail}
              onCheckedChange={setLocalSendEmail}
              data-testid={`switch-email-${category}`}
            />
            <Label htmlFor={`send-email-${category}`}>{t('messaging.sendEmail')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`send-sms-${category}`}
              checked={localSendSms}
              onCheckedChange={setLocalSendSms}
              data-testid={`switch-sms-${category}`}
            />
            <Label htmlFor={`send-sms-${category}`}>{t('messaging.sendSms')}</Label>
          </div>
        </div>

        {localSendEmail && (
          <>
            <div>
              <Label htmlFor={`email-subject-${category}`}>{t('messaging.emailSubject')}</Label>
              <Input
                id={`email-subject-${category}`}
                value={localEmailSubject}
                onChange={(e) => setLocalEmailSubject(e.target.value)}
                placeholder={t('messaging.emailSubjectPlaceholder')}
                data-testid={`input-email-subject-${category}`}
              />
            </div>
            <div>
              <Label htmlFor={`email-body-${category}`}>{t('messaging.emailBody')}</Label>
              <AITextarea
                id={`email-body-${category}`}
                value={localEmailBody}
                onChange={setLocalEmailBody}
                placeholder={t('messaging.emailBodyPlaceholder')}
                context={t('messaging.aiEmailContext', { category: categoryLabel })}
                aiPlaceholder={t('messaging.aiEmailPlaceholder')}
                rows={6}
                className="font-mono text-sm"
                data-testid={`input-email-body-${category}`}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('messaging.emailBodyHelp')}</p>
            </div>
          </>
        )}

        {localSendSms && (
          <div>
            <Label htmlFor={`sms-body-${category}`}>{t('messaging.smsBody')}</Label>
            <AITextarea
              id={`sms-body-${category}`}
              value={localSmsBody}
              onChange={setLocalSmsBody}
              placeholder={t('messaging.smsBodyPlaceholder')}
              context={t('messaging.aiSmsContext', { category: categoryLabel })}
              aiPlaceholder={t('messaging.aiSmsPlaceholder')}
              rows={3}
              className="text-sm"
              data-testid={`input-sms-body-${category}`}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('messaging.smsBodyHelp')}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

export default function MinistryAdminMessaging() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<MessagingAutomationData>({
    queryKey: ["/api/ministry-admin/messaging-automation"],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await apiRequest("PUT", "/api/ministry-admin/messaging-automation", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/messaging-automation"] });
      toast({ title: t('common.saved'), description: t('messaging.savedSuccess') });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t('messaging.saveFailed') });
    },
  });

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <PageHeader title={t('sidebar.messaging')} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={t('sidebar.messaging')}
        description={t('messaging.pageDescription')}
      />
      <Tabs defaultValue="convert" className="space-y-6">
        <TabsList className="inline-flex h-11 w-full max-w-2xl rounded-lg bg-muted p-1.5 gap-1">
          <TabsTrigger
            value="convert"
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('sidebar.converts')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="member"
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Church className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('sidebar.members')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="new_member_guest"
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('sidebar.newMembersGuests')}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="convert">
          <CategoryForm
            category="convert"
            categoryLabel={t('sidebar.converts')}
            config={data.convert}
            onSave={(p) => saveMutation.mutate(p)}
            isSaving={saveMutation.isPending}
            t={t}
          />
        </TabsContent>
        <TabsContent value="member">
          <CategoryForm
            category="member"
            categoryLabel={t('sidebar.members')}
            config={data.member}
            onSave={(p) => saveMutation.mutate(p)}
            isSaving={saveMutation.isPending}
            t={t}
          />
        </TabsContent>
        <TabsContent value="new_member_guest">
          <CategoryForm
            category="new_member_guest"
            categoryLabel={t('sidebar.newMembersGuests')}
            config={data.new_member_guest}
            onSave={(p) => saveMutation.mutate(p)}
            isSaving={saveMutation.isPending}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
