import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Church, type Convert } from "@shared/schema";
import { Search, UserPlus, Phone, Mail, Eye, FileSpreadsheet, MessageSquarePlus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  NEW: "bg-primary/10 text-primary border-primary/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  CONNECTED: "bg-gold/10 text-gold border-gold/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

interface ConvertWithChurch extends Convert {
  church?: { id: string; name: string };
}

const checkinFormSchema = z.object({
  checkinDate: z.string().min(1, "Date is required"),
  outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
  notes: z.string().optional(),
  nextFollowupDate: z.string().optional(),
});

type CheckinFormData = z.infer<typeof checkinFormSchema>;

export default function AdminConverts() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [churchFilter, setChurchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedConvert, setSelectedConvert] = useState<ConvertWithChurch | null>(null);

  const { data: converts, isLoading } = useQuery<ConvertWithChurch[]>({
    queryKey: ["/api/admin/converts", churchFilter, statusFilter, search],
  });

  const { data: churches } = useQuery<Church[]>({
    queryKey: ["/api/admin/churches"],
  });

  const checkinForm = useForm<CheckinFormData>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      checkinDate: format(new Date(), "yyyy-MM-dd"),
      outcome: "CONNECTED",
      notes: "",
      nextFollowupDate: "",
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (data: CheckinFormData) => {
      if (!selectedConvert) return;
      await apiRequest("POST", `/api/admin/converts/${selectedConvert.id}/checkins`, data);
    },
    onSuccess: () => {
      toast({
        title: "Check-in recorded",
        description: "The follow-up check-in has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/converts"] });
      setFollowUpDialogOpen(false);
      setSelectedConvert(null);
      checkinForm.reset({
        checkinDate: format(new Date(), "yyyy-MM-dd"),
        outcome: "CONNECTED",
        notes: "",
        nextFollowupDate: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record check-in",
        variant: "destructive",
      });
    },
  });

  const handleFollowUp = (convert: ConvertWithChurch) => {
    setSelectedConvert(convert);
    checkinForm.reset({
      checkinDate: format(new Date(), "yyyy-MM-dd"),
      outcome: "CONNECTED",
      notes: "",
      nextFollowupDate: "",
    });
    setFollowUpDialogOpen(true);
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (churchFilter !== "all") params.set("churchId", churchFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const response = await fetch(`/api/admin/converts/export-excel?${params}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converts-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredConverts = converts?.filter((convert) => {
    const matchesSearch =
      !search ||
      `${convert.firstName} ${convert.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      convert.phone?.includes(search) ||
      convert.email?.toLowerCase().includes(search.toLowerCase());

    const matchesChurch = churchFilter === "all" || convert.churchId === churchFilter;
    const matchesStatus = statusFilter === "all" || convert.status === statusFilter;

    return matchesSearch && matchesChurch && matchesStatus;
  });

  return (
    <DashboardLayout title="All Converts">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Converts Overview</h2>
            <p className="text-muted-foreground">
              View and filter all converts across ministries
            </p>
          </div>

          <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-converts"
                />
              </div>

              <Select value={churchFilter} onValueChange={setChurchFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-church-filter">
                  <SelectValue placeholder="All Ministries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ministries</SelectItem>
                  {churches?.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CONNECTED">Connected</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConverts && filteredConverts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Ministry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Convert Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConverts.map((convert) => (
                    <TableRow key={convert.id} data-testid={`row-convert-${convert.id}`}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/converts/${convert.id}`}>
                          <span className="hover:underline cursor-pointer text-primary" data-testid={`link-convert-name-${convert.id}`}>
                            {convert.firstName} {convert.lastName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {convert.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {convert.phone}
                            </div>
                          )}
                          {convert.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {convert.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{convert.church?.name || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[convert.status] || ""}>
                          {convert.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(convert.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/converts/${convert.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              data-testid={`button-view-convert-${convert.id}`}
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleFollowUp(convert)}
                            data-testid={`button-followup-convert-${convert.id}`}
                          >
                            <MessageSquarePlus className="h-3 w-3" />
                            Follow Up
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No converts found</h3>
                <p className="text-muted-foreground">
                  {search || churchFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Converts will appear here once leaders add them"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Follow Up Check-in Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Follow-Up</DialogTitle>
            <DialogDescription>
              {selectedConvert && (
                <>Record a check-in for {selectedConvert.firstName} {selectedConvert.lastName} ({selectedConvert.church?.name || "Unknown Ministry"})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...checkinForm}>
            <form
              onSubmit={checkinForm.handleSubmit((data) => checkinMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={checkinForm.control}
                name="checkinDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-admin-followup-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkinForm.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-admin-followup-outcome">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONNECTED">Connected</SelectItem>
                        <SelectItem value="NO_RESPONSE">No Response</SelectItem>
                        <SelectItem value="NEEDS_PRAYER">Needs Prayer</SelectItem>
                        <SelectItem value="SCHEDULED_VISIT">Scheduled Visit</SelectItem>
                        <SelectItem value="REFERRED">Referred</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkinForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this check-in..."
                        {...field}
                        data-testid="input-admin-followup-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkinForm.control}
                name="nextFollowupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Follow-up Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-admin-next-followup-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFollowUpDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={checkinMutation.isPending}
                  data-testid="button-admin-save-followup"
                >
                  {checkinMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Check-in"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
