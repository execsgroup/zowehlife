import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, Church, AlertCircle } from "lucide-react";

const convertFormSchemaBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
  wantsContact: z.enum(["Yes", "No"]).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  isChurchMember: z.enum(["Yes", "No"]).optional(),
  prayerRequest: z.string().optional(),
});

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia",
  "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];


type ConvertFormData = z.infer<typeof convertFormSchemaBase>;

export default function NewConvert() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [customFieldData, setCustomFieldData] = useState<Record<string, any>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isFieldVisible = (key: string) => {
    if (!church?.formConfig?.fieldConfig) return true;
    const cfg = church.formConfig.fieldConfig.find((f: any) => f.key === key);
    return cfg ? cfg.visible : true;
  };

  const getFieldLabel = (key: string, defaultLabel: string) => {
    if (!church?.formConfig?.fieldConfig) return defaultLabel;
    const cfg = church.formConfig.fieldConfig.find((f: any) => f.key === key);
    return cfg?.label || defaultLabel;
  };

  const convertFormSchema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    phone: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    country: z.string().optional(),
    salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
    wantsContact: z.enum(["Yes", "No"]).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
    isChurchMember: z.enum(["Yes", "No"]).optional(),
    prayerRequest: z.string().optional(),
  });

  const { data: church, isLoading: churchLoading, error: churchError } = useQuery<{ id: string; name: string; logoUrl: string | null; formConfig: any }>({
    queryKey: ["/api/public/church", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/church/${token}`);
      if (!res.ok) {
        throw new Error("Ministry not found");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: undefined,
      salvationDecision: undefined,
      wantsContact: undefined,
      gender: undefined,
      ageGroup: undefined,
      isChurchMember: undefined,
      prayerRequest: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ConvertFormData) => {
      const res = await apiRequest("POST", `/api/public/church/${token}/converts`, { ...data, customFieldData: Object.keys(customFieldData).length > 0 ? customFieldData : undefined });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t('publicForms.informationSubmitted'),
        description: t('publicForms.thankYouSubmitted'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('publicForms.submissionFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConvertFormData) => {
    // Validate required custom fields
    if (church?.formConfig?.customFields?.length > 0) {
      const errors: Record<string, string> = {};
      for (const cf of church.formConfig.customFields) {
        if (cf.required && (!customFieldData[cf.id] || customFieldData[cf.id] === '')) {
          errors[cf.id] = `${cf.label} is required`;
        }
      }
      if (Object.keys(errors).length > 0) {
        setCustomFieldErrors(errors);
        return;
      }
    }
    setCustomFieldErrors({});
    submitMutation.mutate(data);
  };

  if (churchLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{t('forms.loading')}</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (churchError || !church) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('publicForms.ministryNotFound')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('publicForms.invalidLink')}
              </p>
              <Link href="/">
                <Button variant="outline">{t('publicForms.returnToHome')}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('publicForms.thankYou')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('publicForms.formSubmitted')} {t('publicForms.leaderWillContact', { name: church.name })}
              </p>
              <Link href="/">
                <Button>{t('publicForms.returnToHome')}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            {church.logoUrl ? (
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                <img
                  src={church.logoUrl}
                  alt={`${church.name} logo`}
                  className="w-full h-full object-cover"
                  data-testid="img-church-logo"
                />
              </div>
            ) : null}
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{church?.formConfig?.heroTitle || t('publicForms.welcomeFamily')}</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Church className="h-5 w-5" />
                <span className="font-medium">{church.name}</span>
              </div>
              <CardTitle>{church?.formConfig?.title || t('publicForms.salvationForm')}</CardTitle>
              <CardDescription className="space-y-3 text-sm">
                {church?.formConfig?.description && (
                  <p>{church.formConfig.description}</p>
                )}
                <p>{t('publicForms.celebrateDecision')}</p>
                <p>{t('publicForms.rededicateHonor')}</p>
                <p>{t('publicForms.godKnowsYou')}</p>
                <p>{t('publicForms.loveToConnect')}</p>
                <p>{t('publicForms.completeFormBelow')}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {isFieldVisible('salvationDecision') && (
                  <FormField
                    control={form.control}
                    name="salvationDecision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('salvationDecision', t('publicForms.pleaseChooseOption'))}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-salvation-decision">
                              <SelectValue placeholder={t('forms.selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I just made Jesus Christ my Lord and Savior">{t('converts.salvationOption1')}</SelectItem>
                            <SelectItem value="I have rededicated my life to Jesus">{t('converts.salvationOption2')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getFieldLabel('firstName', t('forms.firstName'))} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('forms.firstNamePlaceholder')} {...field} data-testid="input-first-name" />
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
                          <FormLabel>{getFieldLabel('lastName', t('forms.lastName'))} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('forms.lastNamePlaceholder')} {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isFieldVisible('phone') && (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('phone', t('converts.phoneNumber'))}</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={t('forms.phonePlaceholder')} {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  {isFieldVisible('email') && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('email', t('converts.emailAddress'))}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('forms.emailPlaceholder')} {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  {isFieldVisible('dateOfBirth') && (
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('dateOfBirth', t('forms.dateOfBirth'))}</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value || ""}
                            onChange={field.onChange}
                            maxDate={new Date()}
                            data-testid="input-date-of-birth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  {isFieldVisible('country') && (
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('country', t('converts.countryOfResidence'))}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue placeholder={t('forms.selectCountry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isFieldVisible('wantsContact') && (
                    <FormField
                      control={form.control}
                      name="wantsContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getFieldLabel('wantsContact', t('converts.wantsContactQuestion'))}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-wants-contact">
                                <SelectValue placeholder={t('forms.selectOption')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">{t('forms.yes')}</SelectItem>
                              <SelectItem value="No">{t('forms.no')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    )}

                    {isFieldVisible('gender') && (
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getFieldLabel('gender', t('forms.gender'))}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder={t('forms.selectGender')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">{t('forms.male')}</SelectItem>
                              <SelectItem value="Female">{t('forms.female')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isFieldVisible('ageGroup') && (
                    <FormField
                      control={form.control}
                      name="ageGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getFieldLabel('ageGroup', t('forms.ageGroup'))}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-age-group">
                                <SelectValue placeholder={t('forms.selectAgeGroup')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Under 18">{t('forms.under18')}</SelectItem>
                              <SelectItem value="18-24">{t('forms.age18to24')}</SelectItem>
                              <SelectItem value="25-34">{t('forms.age25to34')}</SelectItem>
                              <SelectItem value="35 and Above">{t('forms.age35plus')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    )}

                    {isFieldVisible('isChurchMember') && (
                    <FormField
                      control={form.control}
                      name="isChurchMember"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getFieldLabel('isChurchMember', t('converts.churchMemberQuestion'))}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-church-member">
                                <SelectValue placeholder={t('forms.selectOption')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">{t('forms.yes')}</SelectItem>
                              <SelectItem value="No">{t('forms.no')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    )}
                  </div>

                  {isFieldVisible('prayerRequest') && (
                  <FormField
                    control={form.control}
                    name="prayerRequest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('prayerRequest', t('publicForms.prayerRequestAdditional'))}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('publicForms.prayerRequestPlaceholder')}
                            className="resize-none"
                            {...field}
                            data-testid="input-prayer-request"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  {church?.formConfig?.customFields?.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      {church.formConfig.customFields.map((cf: any) => (
                        <div key={cf.id} className="space-y-2">
                          <label className="text-sm font-medium">
                            {cf.label}{cf.required ? ' *' : ''}
                          </label>
                          {cf.type === 'text' && (
                            <Input
                              value={customFieldData[cf.id] || ''}
                              onChange={(e) => { setCustomFieldData(prev => ({ ...prev, [cf.id]: e.target.value })); setCustomFieldErrors(prev => { const next = { ...prev }; delete next[cf.id]; return next; }); }}
                              data-testid={`input-custom-${cf.id}`}
                            />
                          )}
                          {cf.type === 'dropdown' && (
                            <Select
                              value={customFieldData[cf.id] || ''}
                              onValueChange={(v) => { setCustomFieldData(prev => ({ ...prev, [cf.id]: v })); setCustomFieldErrors(prev => { const next = { ...prev }; delete next[cf.id]; return next; }); }}
                            >
                              <SelectTrigger data-testid={`select-custom-${cf.id}`}>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(cf.options || []).map((opt: string) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {cf.type === 'yes_no' && (
                            <Select
                              value={customFieldData[cf.id] || ''}
                              onValueChange={(v) => { setCustomFieldData(prev => ({ ...prev, [cf.id]: v })); setCustomFieldErrors(prev => { const next = { ...prev }; delete next[cf.id]; return next; }); }}
                            >
                              <SelectTrigger data-testid={`select-custom-${cf.id}`}>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {customFieldErrors[cf.id] && (
                            <p className="text-sm text-destructive">{customFieldErrors[cf.id]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-convert"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('forms.submitting')}
                      </>
                    ) : (
                      t('publicForms.submitInformation')
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
