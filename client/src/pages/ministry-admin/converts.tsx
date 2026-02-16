import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { type Convert } from "@shared/schema";
import { Search, UserPlus, Phone, Mail } from "lucide-react";

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  CONNECTED: "bg-coral/10 text-coral border-coral/20",
  NO_RESPONSE: "bg-gold/10 text-gold border-gold/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  REFERRED: "bg-accent/10 text-accent border-accent/20",
  NOT_COMPLETED: "bg-destructive/10 text-destructive border-destructive/20",
  NEVER_CONTACTED: "bg-gold/10 text-gold border-gold/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  CONNECTED: "Connected",
  NO_RESPONSE: "No Response",
  NEEDS_PRAYER: "Needs Prayer",
  REFERRED: "Referred",
  NOT_COMPLETED: "Not Completed",
  NEVER_CONTACTED: "Never Contacted",
  ACTIVE: "Active",
  IN_PROGRESS: "In Progress",
  INACTIVE: "Inactive",
};

export default function MinistryAdminConverts() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: converts, isLoading } = useQuery<Convert[]>({
    queryKey: ["/api/ministry-admin/converts"],
  });

  const filteredConverts = converts?.filter((convert) => {
    const query = searchQuery.toLowerCase();
    return (
      convert.firstName.toLowerCase().includes(query) ||
      convert.lastName.toLowerCase().includes(query) ||
      convert.email?.toLowerCase().includes(query) ||
      convert.phone?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <UserPlus className="h-6 w-6" />
              Converts
            </h1>
            <p className="text-muted-foreground">View all converts in your ministry</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search converts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-converts"
              />
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConverts && filteredConverts.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConverts.map((convert) => (
                      <TableRow key={convert.id} data-testid={`row-convert-${convert.id}`}>
                        <TableCell>
                          <div className="font-medium">
                            {convert.firstName} {convert.lastName}
                          </div>
                          {convert.country && (
                            <div className="text-sm text-muted-foreground">{convert.country}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {convert.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {convert.phone}
                              </div>
                            )}
                            {convert.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {convert.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {convert.salvationDecision || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[convert.status] || ""}>
                            {statusLabels[convert.status] || convert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {convert.selfSubmitted ? "Self-registered" : "Added by leader"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No converts found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "Converts will appear here once leaders add them"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
