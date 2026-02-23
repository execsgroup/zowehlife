import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Trash2, GripVertical, Lock } from "lucide-react";
import type { FormFieldConfig, CustomField } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FormConfig {
  id: string;
  churchId: string;
  formType: string;
  title: string | null;
  heroTitle: string | null;
  description: string | null;
  fieldConfig: FormFieldConfig[];
  customFields: CustomField[];
  updatedAt: string;
}

const DEFAULT_CONVERT_FIELDS: FormFieldConfig[] = [
  { key: "firstName", label: "First Name", visible: true, required: true, locked: true },
  { key: "lastName", label: "Last Name", visible: true, required: true, locked: true },
  { key: "salvationDecision", label: "Salvation Decision", visible: true, required: false, locked: false },
  { key: "phone", label: "Phone Number", visible: true, required: false, locked: false },
  { key: "email", label: "Email Address", visible: true, required: false, locked: false },
  { key: "dateOfBirth", label: "Date of Birth", visible: true, required: false, locked: false },
  { key: "country", label: "Country", visible: true, required: false, locked: false },
  { key: "wantsContact", label: "Would you like someone to contact you?", visible: true, required: false, locked: false },
  { key: "gender", label: "Gender", visible: true, required: false, locked: false },
  { key: "ageGroup", label: "Age Group", visible: true, required: false, locked: false },
  { key: "isChurchMember", label: "Are you a member of a church?", visible: true, required: false, locked: false },
  { key: "prayerRequest", label: "Prayer Request", visible: true, required: false, locked: false },
];

const DEFAULT_NEW_MEMBER_FIELDS: FormFieldConfig[] = [
  { key: "firstName", label: "First Name", visible: true, required: true, locked: true },
  { key: "lastName", label: "Last Name", visible: true, required: true, locked: true },
  { key: "phone", label: "Phone Number", visible: true, required: false, locked: false },
  { key: "email", label: "Email Address", visible: true, required: false, locked: false },
  { key: "gender", label: "Gender", visible: true, required: false, locked: false },
  { key: "ageGroup", label: "Age Group", visible: true, required: false, locked: false },
  { key: "dateOfBirth", label: "Date of Birth", visible: true, required: false, locked: false },
  { key: "country", label: "Country", visible: true, required: false, locked: false },
  { key: "address", label: "Address", visible: true, required: false, locked: false },
  { key: "notes", label: "Additional Notes", visible: true, required: false, locked: false },
];

const DEFAULT_MEMBER_FIELDS: FormFieldConfig[] = [
  { key: "firstName", label: "First Name", visible: true, required: true, locked: true },
  { key: "lastName", label: "Last Name", visible: true, required: true, locked: true },
  { key: "phone", label: "Phone Number", visible: true, required: false, locked: false },
  { key: "email", label: "Email Address", visible: true, required: false, locked: false },
  { key: "gender", label: "Gender", visible: true, required: false, locked: false },
  { key: "ageGroup", label: "Age Group", visible: true, required: false, locked: false },
  { key: "dateOfBirth", label: "Date of Birth", visible: true, required: false, locked: false },
  { key: "memberSince", label: "Member Since", visible: true, required: false, locked: false },
  { key: "country", label: "Country", visible: true, required: false, locked: false },
  { key: "address", label: "Address", visible: true, required: false, locked: false },
  { key: "notes", label: "Additional Notes", visible: true, required: false, locked: false },
];

function getDefaultFields(formType: string): FormFieldConfig[] {
  switch (formType) {
    case "convert": return DEFAULT_CONVERT_FIELDS.map(f => ({ ...f }));
    case "new_member": return DEFAULT_NEW_MEMBER_FIELDS.map(f => ({ ...f }));
    case "member": return DEFAULT_MEMBER_FIELDS.map(f => ({ ...f }));
    default: return [];
  }
}

function getDefaultTitle(formType: string, t: (key: string) => string): string {
  switch (formType) {
    case "convert": return t('publicForms.salvationForm');
    case "new_member": return t('publicForms.newMemberForm');
    case "member": return t('publicForms.memberForm');
    default: return "";
  }
}

function getDefaultHeroTitle(formType: string, t: (key: string) => string): string {
  switch (formType) {
    case "convert": return t('publicForms.welcomeFamily');
    case "new_member": return t('publicForms.welcomeNewMember');
    case "member": return t('publicForms.welcomeMember');
    default: return "";
  }
}

function SortableFieldRow({
  field,
  index,
  onToggleVisibility,
  onToggleRequired,
  onUpdateLabel,
  t,
}: {
  field: FormFieldConfig;
  index: number;
  onToggleVisibility: (index: number) => void;
  onToggleRequired: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  t: (key: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        !field.visible ? "opacity-50 bg-muted/50" : "bg-background"
      }`}
      data-testid={`field-row-${field.key}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${field.key}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      <div className="flex-1 min-w-0">
        <Input
          value={field.label}
          onChange={(e) => onUpdateLabel(index, e.target.value)}
          className="h-8 text-sm"
          data-testid={`input-field-label-${field.key}`}
        />
      </div>
      {field.locked ? (
        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-xs">{t('formSettings.lockedField')}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-muted-foreground">{t('formSettings.visible')}</Label>
            <Switch
              checked={field.visible}
              onCheckedChange={() => onToggleVisibility(index)}
              data-testid={`switch-visible-${field.key}`}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-muted-foreground">{t('formSettings.required')}</Label>
            <Switch
              checked={field.required}
              onCheckedChange={() => onToggleRequired(index)}
              data-testid={`switch-required-${field.key}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FormConfigEditor({ formType, config }: { formType: string; config: FormConfig | null }) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [title, setTitle] = useState(config?.title || "");
  const [heroTitle, setHeroTitle] = useState(config?.heroTitle || "");
  const [description, setDescription] = useState(config?.description || "");
  const [fieldConfig, setFieldConfig] = useState<FormFieldConfig[]>(
    config?.fieldConfig && (config.fieldConfig as FormFieldConfig[]).length > 0
      ? (config.fieldConfig as FormFieldConfig[])
      : getDefaultFields(formType)
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(
    config?.customFields && (config.customFields as CustomField[]).length > 0
      ? (config.customFields as CustomField[])
      : []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setTitle(config?.title || "");
    setHeroTitle(config?.heroTitle || "");
    setDescription(config?.description || "");
    setFieldConfig(
      config?.fieldConfig && (config.fieldConfig as FormFieldConfig[]).length > 0
        ? (config.fieldConfig as FormFieldConfig[])
        : getDefaultFields(formType)
    );
    setCustomFields(
      config?.customFields && (config.customFields as CustomField[]).length > 0
        ? (config.customFields as CustomField[])
        : []
    );
  }, [config, formType]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFieldConfig((items) => {
        const oldIndex = items.findIndex((i) => i.key === active.id);
        const newIndex = items.findIndex((i) => i.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/ministry-admin/form-configurations/${formType}`, {
        title: title || undefined,
        heroTitle: heroTitle || undefined,
        description: description || undefined,
        fieldConfig,
        customFields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/form-configurations"] });
      toast({ title: t('formSettings.saved') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const toggleFieldVisibility = (index: number) => {
    const updated = [...fieldConfig];
    if (updated[index].locked) return;
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    setFieldConfig(updated);
  };

  const toggleFieldRequired = (index: number) => {
    const updated = [...fieldConfig];
    if (updated[index].locked) return;
    updated[index] = { ...updated[index], required: !updated[index].required };
    setFieldConfig(updated);
  };

  const updateFieldLabel = (index: number, label: string) => {
    const updated = [...fieldConfig];
    updated[index] = { ...updated[index], label };
    setFieldConfig(updated);
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      label: "",
      type: "text",
      required: false,
      options: [],
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    const updated = [...customFields];
    const current = updated[fieldIndex].options || [];
    updated[fieldIndex] = { ...updated[fieldIndex], options: [...current, ""] };
    setCustomFields(updated);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const updated = [...customFields];
    const options = [...(updated[fieldIndex].options || [])];
    options[optionIndex] = value;
    updated[fieldIndex] = { ...updated[fieldIndex], options };
    setCustomFields(updated);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...customFields];
    const options = (updated[fieldIndex].options || []).filter((_, i) => i !== optionIndex);
    updated[fieldIndex] = { ...updated[fieldIndex], options };
    setCustomFields(updated);
  };

  const handleReset = () => {
    setTitle("");
    setHeroTitle("");
    setDescription("");
    setFieldConfig(getDefaultFields(formType));
    setCustomFields([]);
    setShowResetDialog(false);
  };

  return (
    <div className="space-y-6">
      <Section
        title={t('formSettings.formTitleAndDescription')}
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} data-testid="button-reset-form">
            {t('formSettings.resetToDefault')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1 block">{t('formSettings.heroTitle')}</Label>
            <Input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder={getDefaultHeroTitle(formType, t)}
              data-testid="input-hero-title"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('formSettings.heroTitleHelp')}</p>
          </div>
          <div>
            <Label className="text-xs mb-1 block">{t('formSettings.formTitle')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={getDefaultTitle(formType, t)}
              data-testid="input-form-title"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">{t('formSettings.formDescription')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('formSettings.formDescriptionPlaceholder')}
              className="min-h-[80px]"
              data-testid="textarea-form-description"
            />
          </div>
        </div>
      </Section>

      <Section title={t('formSettings.standardFields')}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fieldConfig.map((f) => f.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {fieldConfig.map((field, index) => (
                <SortableFieldRow
                  key={field.key}
                  field={field}
                  index={index}
                  onToggleVisibility={toggleFieldVisibility}
                  onToggleRequired={toggleFieldRequired}
                  onUpdateLabel={updateFieldLabel}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Section>

      <Section
        title={t('formSettings.customFields')}
        actions={
          <Button variant="outline" size="sm" onClick={addCustomField} data-testid="button-add-custom-field">
            <Plus className="h-4 w-4 mr-1" />
            {t('formSettings.addCustomField')}
          </Button>
        }
      >
        {customFields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-custom-fields">
            {t('formSettings.noCustomFields')}
          </p>
        ) : (
          <div className="space-y-4">
            {customFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3" data-testid={`custom-field-${index}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block">{t('formSettings.fieldLabel')}</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateCustomField(index, { label: e.target.value })}
                          placeholder={t('formSettings.fieldLabelPlaceholder')}
                          data-testid={`input-custom-label-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">{t('formSettings.fieldType')}</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateCustomField(index, { type: value as "text" | "dropdown" | "yes_no" })}
                        >
                          <SelectTrigger data-testid={`select-custom-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">{t('formSettings.textField')}</SelectItem>
                            <SelectItem value="dropdown">{t('formSettings.dropdownField')}</SelectItem>
                            <SelectItem value="yes_no">{t('formSettings.yesNoField')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{t('formSettings.required')}</Label>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateCustomField(index, { required: checked })}
                        data-testid={`switch-custom-required-${index}`}
                      />
                    </div>

                    {field.type === "dropdown" && (
                      <div className="space-y-2">
                        <Label className="text-xs">{t('formSettings.options')}</Label>
                        {(field.options || []).map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(index, optIndex, e.target.value)}
                              placeholder={t('formSettings.optionPlaceholder')}
                              className="h-8 text-sm"
                              data-testid={`input-option-${index}-${optIndex}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => removeOption(index, optIndex)}
                              data-testid={`button-remove-option-${index}-${optIndex}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(index)}
                          data-testid={`button-add-option-${index}`}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {t('formSettings.addOption')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeCustomField(index)}
                    data-testid={`button-remove-custom-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-form-config"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('formSettings.saving')}
            </>
          ) : (
            t('formSettings.saveChanges')
          )}
        </Button>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('formSettings.resetToDefault')}</DialogTitle>
            <DialogDescription>{t('formSettings.resetConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} data-testid="button-cancel-reset">
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReset} data-testid="button-confirm-reset">
              {t('formSettings.resetToDefault')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FormSettings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("convert");

  const { data: configs, isLoading } = useQuery<FormConfig[]>({
    queryKey: ["/api/ministry-admin/form-configurations"],
  });

  const getConfigForType = (formType: string) => {
    return configs?.find(c => c.formType === formType) || null;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={t('formSettings.title')}
        description={t('formSettings.description')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-form-type">
          <TabsTrigger value="convert" data-testid="tab-convert">{t('formSettings.salvationForm')}</TabsTrigger>
          <TabsTrigger value="new_member" data-testid="tab-new-member">{t('formSettings.newMemberForm')}</TabsTrigger>
          <TabsTrigger value="member" data-testid="tab-member">{t('formSettings.memberForm')}</TabsTrigger>
        </TabsList>

        <TabsContent value="convert" className="mt-6">
          <FormConfigEditor formType="convert" config={getConfigForType("convert")} />
        </TabsContent>
        <TabsContent value="new_member" className="mt-6">
          <FormConfigEditor formType="new_member" config={getConfigForType("new_member")} />
        </TabsContent>
        <TabsContent value="member" className="mt-6">
          <FormConfigEditor formType="member" config={getConfigForType("member")} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
