import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AITextarea } from "@/components/ai-text-helper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSortableTable } from "@/hooks/use-sortable-table";
import { SortableTableHead } from "@/components/sortable-table-head";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Calendar,
  CalendarPlus,
  Clock,
  Loader2,
  Mail,
  Phone,
  Search,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  date: string;
}

interface MassFollowUpResult {
  personId: string;
  name: string;
  success: boolean;
  error?: string;
}


const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = typeof dateStr === "string" && dateStr.includes("T")
      ? new Date(dateStr)
      : new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

const formatTime12h = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function MassFollowUp() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const basePath = useBasePath();
  const apiBasePath = `/api${basePath}`;

  const [category, setCategory] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [includeVideoLink, setIncludeVideoLink] = useState(true);
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const categoryLabels: Record<string, string> = {
    converts: t('massFollowUp.followUpConverts'),
    new_members: t('massFollowUp.newMemberFollowUp'),
    members: t('massFollowUp.memberFollowUp'),
  };

  const dateFilterLabels: Record<string, string> = {
    converts: t('forms.convertDate'),
    new_members: t('forms.visitDate'),
    members: t('forms.memberSince'),
    guests: t('forms.visitDate'),
  };

  const [results, setResults] = useState<MassFollowUpResult[] | null>(null);

  const { sortedData: sortedCandidates, sortConfig: sortConfigCandidates, requestSort: requestSortCandidates } = useSortableTable(candidates);
  const { sortedData: sortedResults, sortConfig: sortConfigResults, requestSort: requestSortResults } = useSortableTable(results ?? undefined);

  const fetchCandidates = async () => {
    if (!category) {
      toast({ title: t('massFollowUp.selectCategory'), description: t('massFollowUp.selectCategoryDesc'), variant: "destructive" });
      return;
    }
    setIsLoadingCandidates(true);
    setHasFetched(true);
    setSelectedIds(new Set());
    setResults(null);
    try {
      const response = await apiRequest("POST", `${apiBasePath}/mass-followup/candidates`, {
        category,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const data = await response.json();
      setCandidates(data);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || t('common.failedToSave'), variant: "destructive" });
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const massFollowUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `${apiBasePath}/mass-followup`, {
        category,
        personIds: Array.from(selectedIds),
        nextFollowupDate: followUpDate,
        nextFollowupTime: followUpTime || undefined,
        includeVideoLink,
        customSubject: customSubject || undefined,
        customMessage: customMessage || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      toast({
        title: t('followUps.followUpScheduled'),
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/guests`] });
    },
    onError: (err: any) => {
      toast({ title: t('common.error'), description: err.message || t('common.failedToSave'), variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  const canSubmit = selectedIds.size > 0 && followUpDate && !massFollowUpMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title={t('sidebar.massFollowUp')}
          description={t('massFollowUp.description')}
        />

        <Section>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>{t('forms.category')}</Label>
                <Select
                  value={category}
                  onValueChange={(val) => {
                    setCategory(val);
                    setCandidates([]);
                    setSelectedIds(new Set());
                    setHasFetched(false);
                    setResults(null);
                  }}
                  data-testid="select-category"
                >
                  <SelectTrigger data-testid="select-category-trigger">
                    <SelectValue placeholder={t('forms.selectOption')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="converts" data-testid="option-converts">{t('massFollowUp.followUpConverts')}</SelectItem>
                    <SelectItem value="new_members" data-testid="option-new-members">{t('massFollowUp.newMemberFollowUp')}</SelectItem>
                    <SelectItem value="members" data-testid="option-members">{t('massFollowUp.memberFollowUp')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {category && (
                <>
                  <div className="space-y-2">
                    <Label>{dateFilterLabels[category]} {t('forms.from')}</Label>
                    <DatePicker
                      value={dateFrom}
                      onChange={setDateFrom}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{dateFilterLabels[category]} {t('forms.to')}</Label>
                    <DatePicker
                      value={dateTo}
                      onChange={setDateTo}
                      data-testid="input-date-to"
                    />
                  </div>
                </>
              )}

              <Button
                onClick={fetchCandidates}
                disabled={!category || isLoadingCandidates}
                data-testid="button-search-candidates"
              >
                {isLoadingCandidates ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">{t('forms.search')}</span>
              </Button>
            </div>
          </div>
        </Section>

        {isLoadingCandidates && (
          <Section>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </Section>
        )}

        {!isLoadingCandidates && hasFetched && candidates.length === 0 && (
          <Section>
            <div className="py-8 text-center">
              <Filter className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {t('massFollowUp.noMatchingCriteria', { category: categoryLabels[category] || t('massFollowUp.people') })}
              </p>
            </div>
          </Section>
        )}

        {!isLoadingCandidates && candidates.length > 0 && !results && (
          <>
            <Section
              title={`${categoryLabels[category]} (${candidates.length} ${t('massFollowUp.found')})`}
              actions={
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedIds.size} {t('massFollowUp.selected')}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    data-testid="button-select-all"
                  >
                    {selectedIds.size === candidates.length ? t('forms.deselectAll') : t('forms.selectAll')}
                  </Button>
                </div>
              }
            >
                <div className="rounded-md border overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <SortableTableHead label={t('forms.name')} sortKey="firstName" sortConfig={sortConfigCandidates} onSort={requestSortCandidates} />
                        <SortableTableHead label={t('forms.email')} sortKey="email" sortConfig={sortConfigCandidates} onSort={requestSortCandidates} />
                        <SortableTableHead label={t('forms.phone')} sortKey="phone" sortConfig={sortConfigCandidates} onSort={requestSortCandidates} />
                        <SortableTableHead label={dateFilterLabels[category]} sortKey="date" sortConfig={sortConfigCandidates} onSort={requestSortCandidates} />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sortedCandidates ?? candidates).map((candidate) => (
                        <TableRow
                          key={candidate.id}
                          className="cursor-pointer"
                          onClick={() => toggleSelect(candidate.id)}
                          data-testid={`row-candidate-${candidate.id}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(candidate.id)}
                              onCheckedChange={() => toggleSelect(candidate.id)}
                              data-testid={`checkbox-candidate-${candidate.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </TableCell>
                          <TableCell>
                            {candidate.email ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {candidate.email}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.phone ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {candidate.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(candidate.date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            </Section>

            {selectedIds.size > 0 && (
              <Section
                title={t('massFollowUp.scheduleForCount', { count: selectedIds.size, people: selectedIds.size === 1 ? t('massFollowUp.person') : t('massFollowUp.people') })}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {t('massFollowUp.followUpDate')}
                      </Label>
                      <DatePicker
                        value={followUpDate}
                        onChange={setFollowUpDate}
                        minDate={new Date()}
                        data-testid="input-followup-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {t('massFollowUp.followUpTimeOptional')}
                      </Label>
                      <TimePicker
                        value={followUpTime}
                        onChange={setFollowUpTime}
                        data-testid="input-followup-time"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="include-video"
                      checked={includeVideoLink}
                      onCheckedChange={(checked) => setIncludeVideoLink(!!checked)}
                      data-testid="checkbox-include-video"
                    />
                    <Label htmlFor="include-video" className="flex items-center gap-2 cursor-pointer">
                      <Video className="h-4 w-4" />
                      {t('followUps.includeVideoCallLink')}
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-subject">{t('followUps.customSubject')}</Label>
                    <Input
                      id="custom-subject"
                      placeholder={t('followUps.leaveBlankSubject')}
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      data-testid="input-custom-subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-message">{t('followUps.customMessage')}</Label>
                    <AITextarea
                      id="custom-message"
                      value={customMessage}
                      onChange={setCustomMessage}
                      placeholder={t('followUps.leaveBlankMessage')}
                      context={`Writing a follow-up email message for ${categoryLabels[category] || "people"} at a church/ministry. The message should be warm, encouraging, and faith-based.`}
                      aiPlaceholder="e.g., Make it more encouraging, add a scripture..."
                      rows={4}
                      data-testid="input-custom-message"
                    />
                  </div>

                  <Button
                    onClick={() => massFollowUpMutation.mutate()}
                    disabled={!canSubmit}
                    className="w-full sm:w-auto"
                    data-testid="button-schedule-mass-followup"
                  >
                    {massFollowUpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CalendarPlus className="h-4 w-4 mr-2" />
                    )}
                    {t('massFollowUp.scheduleForCount', { count: selectedIds.size, people: selectedIds.size === 1 ? t('massFollowUp.person') : t('massFollowUp.people') })}
                  </Button>
                </div>
              </Section>
            )}
          </>
        )}

        {results && (
          <Section
            title={t('massFollowUp.results')}
            description={t('massFollowUp.resultsDesc', { success: results.filter(r => r.success).length }) + (results.filter(r => !r.success).length > 0 ? t('massFollowUp.resultsFailed', { failed: results.filter(r => !r.success).length }) : "")}
          >
              <div className="rounded-md border overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('forms.name')} sortKey="name" sortConfig={sortConfigResults} onSort={requestSortResults} />
                      <TableHead>{t('forms.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sortedResults ?? results).map((result) => (
                      <TableRow key={result.personId} data-testid={`row-result-${result.personId}`}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('statusLabels.scheduled')}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              {t('massFollowUp.failed')}: {result.error}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResults(null);
                    setSelectedIds(new Set());
                    fetchCandidates();
                  }}
                  data-testid="button-schedule-more"
                >
                  {t('forms.scheduleMore')}
                </Button>
              </div>
          </Section>
        )}
      </div>
    </DashboardLayout>
  );
}
