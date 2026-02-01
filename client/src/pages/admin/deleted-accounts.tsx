import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type ArchivedMinistry } from "@shared/schema";
import { RotateCcw, Trash2, Loader2, Archive, MapPin, Users, Calendar, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface ArchivedMinistryWithCounts extends ArchivedMinistry {
  userCount?: number;
  convertCount?: number;
  newMemberCount?: number;
  memberCount?: number;
}

export default function DeletedAccounts() {
  const { toast } = useToast();
  
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedMinistryWithCounts | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  const { data: archivedMinistries, isLoading } = useQuery<ArchivedMinistryWithCounts[]>({
    queryKey: ["/api/admin/archived-ministries"],
  });

  const reinstateMutation = useMutation({
    mutationFn: async (archiveId: string) => {
      await apiRequest("POST", `/api/admin/archived-ministries/${archiveId}/reinstate`);
    },
    onSuccess: () => {
      toast({
        title: "Ministry restored",
        description: "The ministry account has been successfully restored. Leaders will receive new temporary passwords.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-ministries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      closeReinstateDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore ministry account",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (archiveId: string) => {
      await apiRequest("DELETE", `/api/admin/archived-ministries/${archiveId}`);
    },
    onSuccess: () => {
      toast({
        title: "Permanently deleted",
        description: "The archived ministry has been permanently deleted and cannot be recovered.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-ministries"] });
      closeDeleteDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to permanently delete ministry",
        variant: "destructive",
      });
    },
  });

  const openReinstateDialog = (archive: ArchivedMinistryWithCounts) => {
    setSelectedArchive(archive);
    setReinstateDialogOpen(true);
  };

  const closeReinstateDialog = () => {
    setReinstateDialogOpen(false);
    setSelectedArchive(null);
  };

  const openDeleteDialog = (archive: ArchivedMinistryWithCounts) => {
    setSelectedArchive(archive);
    setConfirmText("");
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedArchive(null);
    setConfirmText("");
  };

  const openViewDetails = (archive: ArchivedMinistryWithCounts) => {
    setSelectedArchive(archive);
    setViewDetailsOpen(true);
  };

  const closeViewDetails = () => {
    setViewDetailsOpen(false);
    setSelectedArchive(null);
  };

  const handleReinstate = () => {
    if (selectedArchive) {
      reinstateMutation.mutate(selectedArchive.id);
    }
  };

  const handlePermanentDelete = () => {
    if (confirmText === "Delete Permanently" && selectedArchive) {
      permanentDeleteMutation.mutate(selectedArchive.id);
    }
  };

  const getBackupStats = (archive: ArchivedMinistryWithCounts) => {
    const backupData = archive.backupData as any;
    return {
      users: backupData?.users?.length || 0,
      converts: backupData?.converts?.length || 0,
      newMembers: backupData?.newMembers?.length || 0,
      members: backupData?.members?.length || 0,
    };
  };

  return (
    <DashboardLayout title="Deleted Accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-muted-foreground">
              View and manage cancelled ministry accounts. You can restore accounts or permanently delete them.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Ministries
            </CardTitle>
            <CardDescription>
              Ministries that have been cancelled. Data is backed up and can be restored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : archivedMinistries && archivedMinistries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ministry Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Backed Up Data</TableHead>
                    <TableHead>Deleted By</TableHead>
                    <TableHead>Deleted On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedMinistries.map((archive) => {
                    const stats = getBackupStats(archive);
                    return (
                      <TableRow key={archive.id} data-testid={`row-archive-${archive.id}`}>
                        <TableCell className="font-medium">{archive.churchName}</TableCell>
                        <TableCell>
                          {archive.churchLocation && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {archive.churchLocation}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {stats.users} users
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stats.converts} converts
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {archive.deletedByRole === "ADMIN" ? "Platform Admin" : "Ministry Admin"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(archive.archivedAt), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => openViewDetails(archive)}
                                  data-testid={`button-view-archive-${archive.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View backup details</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => openReinstateDialog(archive)}
                                  data-testid={`button-reinstate-${archive.id}`}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Restore ministry account</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => openDeleteDialog(archive)}
                                  data-testid={`button-permanent-delete-${archive.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Permanently delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deleted accounts</h3>
                <p className="text-muted-foreground">
                  When ministry accounts are cancelled, they will appear here for restoration or permanent deletion.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={(open) => !open && closeViewDetails()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Backup Details</DialogTitle>
            <DialogDescription>
              Details of the backed up ministry data for {selectedArchive?.churchName}
            </DialogDescription>
          </DialogHeader>
          {selectedArchive && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ministry Name</p>
                  <p className="font-medium">{selectedArchive.churchName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedArchive.churchLocation || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deleted By</p>
                  <Badge variant="outline">
                    {selectedArchive.deletedByRole === "ADMIN" ? "Platform Admin" : "Ministry Admin"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deleted On</p>
                  <p className="font-medium">{format(new Date(selectedArchive.archivedAt), "PPP")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Backed Up Data</p>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const stats = getBackupStats(selectedArchive);
                    return (
                      <>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{stats.users} Users</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{stats.converts} Converts</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{stats.newMembers} New Members</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{stats.members} Members</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeViewDetails} data-testid="button-close-view-details">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate Confirmation Dialog */}
      <Dialog open={reinstateDialogOpen} onOpenChange={(open) => !open && closeReinstateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Ministry Account?</DialogTitle>
            <DialogDescription>
              This will restore the ministry account for{" "}
              <span className="font-semibold">{selectedArchive?.churchName}</span>.
              All users will be recreated with new temporary passwords and will need to reset them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeReinstateDialog}
              data-testid="button-cancel-reinstate"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReinstate}
              disabled={reinstateMutation.isPending}
              data-testid="button-confirm-reinstate"
              className="gap-2"
            >
              {reinstateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Restore Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Permanently Delete?</DialogTitle>
            <DialogDescription>
              This will permanently delete all backed up data for{" "}
              <span className="font-semibold">{selectedArchive?.churchName}</span>.
              This action cannot be undone. Type{" "}
              <span className="font-bold">Delete Permanently</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Type 'Delete Permanently' to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              data-testid="input-confirm-permanent-delete"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              data-testid="button-cancel-permanent-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={confirmText !== "Delete Permanently" || permanentDeleteMutation.isPending}
              data-testid="button-confirm-permanent-delete"
            >
              {permanentDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
