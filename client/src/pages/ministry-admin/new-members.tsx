import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Users, Phone, Mail, Eye } from "lucide-react";
import { format } from "date-fns";

interface NewMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  dateOfBirth: string | null;
  country: string | null;
  gender: string | null;
  ageGroup: string | null;
  status: string;
  followUpStage: string | null;
  notes: string | null;
  selfSubmitted: boolean;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  CONTACTED: "bg-accent/10 text-accent border-accent/20",
  ACTIVE: "bg-coral/10 text-coral border-coral/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

const followUpStageLabels: Record<string, string> = {
  NEW: "Not Started",
  CONTACT_NEW_MEMBER: "Needs Contact",
  SCHEDULED: "1st Scheduled",
  FIRST_COMPLETED: "1st Completed",
  INITIATE_SECOND: "Ready for 2nd",
  SECOND_SCHEDULED: "2nd Scheduled",
  SECOND_COMPLETED: "2nd Completed",
  INITIATE_FINAL: "Ready for Final",
  FINAL_SCHEDULED: "Final Scheduled",
  FINAL_COMPLETED: "Completed",
};

const followUpStageColors: Record<string, string> = {
  NEW: "bg-accent/10 text-accent border-accent/20",
  CONTACT_NEW_MEMBER: "bg-gold/10 text-gold border-gold/20",
  SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  FIRST_COMPLETED: "bg-coral/10 text-coral border-coral/20",
  INITIATE_SECOND: "bg-primary/10 text-primary border-primary/20",
  SECOND_SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  SECOND_COMPLETED: "bg-coral/10 text-coral border-coral/20",
  INITIATE_FINAL: "bg-primary/10 text-primary border-primary/20",
  FINAL_SCHEDULED: "bg-accent/10 text-accent border-accent/20",
  FINAL_COMPLETED: "bg-coral/10 text-coral border-coral/20",
};


export default function MinistryAdminNewMembers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: newMembers, isLoading } = useQuery<NewMember[]>({
    queryKey: ["/api/ministry-admin/new-members"],
  });

  const filteredMembers = newMembers?.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(query) ||
      member.lastName.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.phone?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Users className="h-6 w-6" />
              New Members
            </h1>
            <p className="text-muted-foreground">View all new members in your ministry</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search new members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-new-members"
              />
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Gender / Age</TableHead>
                      <TableHead>Follow Up Status</TableHead>
                      <TableHead>Visit Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-new-member-${member.id}`}>
                        <TableCell>
                          <Link href={`/ministry-admin/new-members/${member.id}`}>
                            <div 
                              className="font-medium cursor-pointer hover:text-primary hover:underline"
                              data-testid={`link-view-details-${member.id}`}
                            >
                              {member.firstName} {member.lastName}
                            </div>
                          </Link>
                          {member.country && (
                            <div className="text-sm text-muted-foreground">{member.country}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {member.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </div>
                            )}
                            {member.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {member.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {member.gender || "—"} / {member.ageGroup || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={followUpStageColors[member.followUpStage || "NEW"]}>
                            {followUpStageLabels[member.followUpStage || "NEW"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(member.createdAt), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No new members found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "New members will appear here once they register or are added by leaders"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
