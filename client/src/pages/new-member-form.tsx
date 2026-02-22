import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2, Church } from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { publicNewMemberSubmissionSchema, type PublicNewMemberSubmission } from "@shared/schema";

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
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Namibia", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

type FormData = PublicNewMemberSubmission;

export default function NewMemberForm() {
  const { t } = useTranslation();
  const [, params] = useRoute("/new-member/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [customFieldData, setCustomFieldData] = useState<Record<string, any>>({});

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

  const { data: church, isLoading: churchLoading, error: churchError } = useQuery<{
    id: string;
    name: string;
    location: string | null;
    logoUrl: string | null;
    formConfig: any;
  }>({
    queryKey: ["/api/public/church/new-member", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/church/new-member/${token}`);
      if (!res.ok) {
        throw new Error("Ministry not found");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(publicNewMemberSubmissionSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      address: "",
      country: undefined,
      gender: undefined,
      ageGroup: undefined,
      notes: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", `/api/public/church/new-member/${token}/submit`, { ...data, customFieldData: Object.keys(customFieldData).length > 0 ? customFieldData : undefined });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('publicForms.failedToSubmitRegistration'),
        variant: "destructive",
      });
    },
  });

  if (churchLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (churchError || !church) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="container max-w-lg mx-auto py-16 px-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Church className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">{t('publicForms.ministryNotFound')}</h2>
              <p className="text-muted-foreground mt-2">
                {t('publicForms.invalidLink')}
              </p>
            </CardContent>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="container max-w-lg mx-auto py-16 px-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
              <h2 className="mt-4 text-2xl font-bold">{t('publicForms.thankYou')}</h2>
              <p className="text-muted-foreground mt-2">
                {t('publicForms.formSubmitted')} {t('publicForms.someoneWillContact', { name: church.name })}
              </p>
            </CardContent>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container max-w-lg mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            {church.logoUrl && (
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden">
                <img
                  src={church.logoUrl}
                  alt={church.name}
                  className="w-full h-full object-cover"
                  data-testid="img-church-logo"
                />
              </div>
            )}
            <CardTitle className="text-2xl">{t('publicForms.newMemberForm')}</CardTitle>
            <CardDescription>
              {church?.formConfig?.description && (
                <p className="mb-2">{church.formConfig.description}</p>
              )}
              {t('publicForms.joinAsNewMember', { name: church.name })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('firstName', t('forms.firstName'))} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('forms.firstNameShort')} {...field} data-testid="input-firstname" />
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
                          <Input placeholder={t('forms.lastNameShort')} {...field} data-testid="input-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {isFieldVisible('phone') && (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('phone', t('forms.phone'))}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('forms.phoneNumberLabel')} {...field} data-testid="input-phone" />
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
                        <FormLabel>{getFieldLabel('email', t('forms.email'))}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('forms.emailAddressLabel')} {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {isFieldVisible('gender') && (
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('gender', t('forms.gender'))}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                  {isFieldVisible('ageGroup') && (
                  <FormField
                    control={form.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getFieldLabel('ageGroup', t('forms.ageGroup'))}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </div>

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
                          data-testid="input-dob"
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
                      <FormLabel>{getFieldLabel('country', t('forms.country'))}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder={t('forms.selectCountry')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}

                {isFieldVisible('address') && (
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel('address', t('forms.address'))}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('publicForms.fullAddress')} {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}

                {isFieldVisible('notes') && (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getFieldLabel('notes', t('publicForms.additionalNotesAndPrayer'))}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('publicForms.anyAdditionalInfo')} {...field} data-testid="input-notes" />
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
                            onChange={(e) => setCustomFieldData(prev => ({ ...prev, [cf.id]: e.target.value }))}
                            data-testid={`input-custom-${cf.id}`}
                          />
                        )}
                        {cf.type === 'dropdown' && (
                          <Select
                            value={customFieldData[cf.id] || ''}
                            onValueChange={(v) => setCustomFieldData(prev => ({ ...prev, [cf.id]: v }))}
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
                            onValueChange={(v) => setCustomFieldData(prev => ({ ...prev, [cf.id]: v }))}
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
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('forms.submitting')}
                    </>
                  ) : (
                    t('publicForms.submitRegistration')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <PublicFooter />
    </div>
  );
}
