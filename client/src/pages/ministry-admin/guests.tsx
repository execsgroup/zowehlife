import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { type Guest } from "@shared/schema";
import { Search, Users2, Phone, Mail, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function MinistryAdminGuests() {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [search, setSearch] = useState("");

  const { data: guests, isLoading } = useQuery<Guest[]>({
    queryKey: ["/api/ministry-admin/guests"],
  });

  const handleViewDetails = (guest: Guest) => {
    setSelectedGuest(guest);
    setViewDialogOpen(true);
  };

  const filteredGuests = guests?.filter((guest) => {
    const matchesSearch =
      !search ||
      `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      guest.phone?.includes(search) ||
      guest.email?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <DashboardLayout title="Guest List">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Guest List</h2>
            <p className="text-muted-foreground">
              View guests in your ministry
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-guests"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredGuests?.length === 0 ? (
              <div className="text-center py-12">
                <Users2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No guests found</h3>
                <p className="text-muted-foreground">
                  No guests have been added yet or your search returned no results.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuests?.map((guest) => (
                      <TableRow key={guest.id} data-testid={`row-guest-${guest.id}`}>
                        <TableCell>
                          <div 
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => handleViewDetails(guest)}
                            data-testid={`link-view-details-${guest.id}`}
                          >
                            {guest.firstName} {guest.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {guest.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {guest.phone}
                              </div>
                            )}
                            {guest.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {guest.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{guest.gender || "-"}</TableCell>
                        <TableCell>
                          {guest.createdAt ? format(new Date(guest.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Guest Details</DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">First Name</p>
                  <p className="font-medium">{selectedGuest.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Name</p>
                  <p className="font-medium">{selectedGuest.lastName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedGuest.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedGuest.email || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{selectedGuest.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age Group</p>
                  <p className="font-medium">{selectedGuest.ageGroup || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="font-medium">{selectedGuest.country || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedGuest.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {selectedGuest.dateOfBirth 
                    ? format(new Date(selectedGuest.dateOfBirth), "MMMM d, yyyy") 
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{selectedGuest.notes || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Added</p>
                <p className="font-medium">
                  {selectedGuest.createdAt 
                    ? format(new Date(selectedGuest.createdAt), "MMMM d, yyyy") 
                    : "-"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
