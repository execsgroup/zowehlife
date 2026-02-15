import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const categoryLabels: Record<string, string> = {
  converts: "Follow Up Converts",
  new_members: "New Member Follow Up",
  members: "Member Follow Up",
  guests: "Guest List",
};

const dateFilterLabels: Record<string, string> = {
  converts: "Convert Date",
  new_members: "Visit Date",
  members: "Members Since",
  guests: "Visit Date",
};

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

  const [results, setResults] = useState<MassFollowUpResult[] | null>(null);

  const fetchCandidates = async () => {
    if (!category) {
      toast({ title: "Select a category", description: "Please choose a category first.", variant: "destructive" });
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
      toast({ title: "Error", description: err.message || "Failed to fetch candidates", variant: "destructive" });
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
        title: "Follow-ups scheduled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/converts`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/new-members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/members`] });
      queryClient.invalidateQueries({ queryKey: [`${apiBasePath}/guests`] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to schedule follow-ups", variant: "destructive" });
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
    <DashboardLayout title="Mass Follow-Up">
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mass Follow-Up Scheduling
            </CardTitle>
            <CardDescription>
              Schedule follow-ups for multiple people at once. Each person will receive a unique video call link and email notification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Category</Label>
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
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="converts" data-testid="option-converts">Follow Up Converts</SelectItem>
                    <SelectItem value="new_members" data-testid="option-new-members">New Member Follow Up</SelectItem>
                    <SelectItem value="members" data-testid="option-members">Member Follow Up</SelectItem>
                    <SelectItem value="guests" data-testid="option-guests">Guest List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {category && (
                <>
                  <div className="space-y-2">
                    <Label>{dateFilterLabels[category]} From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{dateFilterLabels[category]} To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
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
                <span className="ml-2">Search</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoadingCandidates && (
          <Card>
            <CardContent className="py-6">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingCandidates && hasFetched && candidates.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Filter className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No {categoryLabels[category] || "people"} found matching your criteria. Try adjusting the date filters.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoadingCandidates && candidates.length > 0 && !results && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="text-base">
                    {categoryLabels[category]} ({candidates.length} found)
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {selectedIds.size} selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      data-testid="button-select-all"
                    >
                      {selectedIds.size === candidates.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>{dateFilterLabels[category]}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((candidate) => (
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
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.phone ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {candidate.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
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
              </CardContent>
            </Card>

            {selectedIds.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarPlus className="h-5 w-5" />
                    Schedule Follow-Up for {selectedIds.size} {selectedIds.size === 1 ? "Person" : "People"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="followup-date" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Follow-Up Date
                      </Label>
                      <Input
                        id="followup-date"
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        data-testid="input-followup-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="followup-time" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Follow-Up Time (Optional)
                      </Label>
                      <Input
                        id="followup-time"
                        type="time"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
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
                      Include unique video call link for each person
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-subject">Custom Email Subject (Optional)</Label>
                    <Input
                      id="custom-subject"
                      placeholder="e.g., Follow-Up Meeting Scheduled"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      data-testid="input-custom-subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-message">Custom Email Message (Optional)</Label>
                    <Textarea
                      id="custom-message"
                      placeholder="Add a personal message to include in the notification email..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
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
                    Schedule Follow-Up for {selectedIds.size} {selectedIds.size === 1 ? "Person" : "People"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
              <CardDescription>
                {results.filter(r => r.success).length} follow-ups scheduled successfully
                {results.filter(r => !r.success).length > 0 &&
                  `, ${results.filter(r => !r.success).length} failed`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.personId} data-testid={`row-result-${result.personId}`}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Scheduled
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed: {result.error}
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
                  Schedule More
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
