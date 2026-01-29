import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { type Church, type Convert } from "@shared/schema";
import { Search, UserPlus, Download, Phone, Mail, Eye, FileSpreadsheet } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  NEW: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

interface ConvertWithChurch extends Convert {
  church?: { id: string; name: string };
}

export default function AdminConverts() {
  const [search, setSearch] = useState("");
  const [churchFilter, setChurchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: converts, isLoading } = useQuery<ConvertWithChurch[]>({
    queryKey: ["/api/admin/converts", churchFilter, statusFilter, search],
  });

  const { data: churches } = useQuery<Church[]>({
    queryKey: ["/api/admin/churches"],
  });

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
              View and filter all converts across churches
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
                  <SelectValue placeholder="All Churches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Churches</SelectItem>
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
                    <TableHead>Church</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
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
    </DashboardLayout>
  );
}
