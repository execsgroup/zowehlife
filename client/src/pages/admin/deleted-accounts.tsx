import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
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
import { useSortableTable } from "@/hooks/use-sortable-table";
import { SortableTableHead } from "@/components/sortable-table-head";

interface ArchivedMinistryWithCounts extends ArchivedMinistry {
  userCount?: number;
  convertCount?: number;
  newMemberCount?: number;
  memberCount?: number;
}

export default function DeletedAccounts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedMinistryWithCounts | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  const { data: archivedMinistries, isLoading } = useQuery<ArchivedMinistryWithCounts[]>({
    queryKey: ["/api/admin/archived-ministries"],
  });

  const { sortedData: sortedArchives, sortConfig, requestSort } = useSortableTable(archivedMinistries);

  const reinstateMutation = useMutation({
    mutationFn: async (archiveId: string) => {
      await apiRequest("POST", `/api/admin/archived-ministries/${archiveId}/reinstate`);
    },
    onSuccess: () => {
      toast({
        title: t('deletedAccounts.restored'),
        description: t('deletedAccounts.restoredDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-ministries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      closeReinstateDialog();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
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
        title: t('deletedAccounts.permanentlyDeleted'),
        description: t('deletedAccounts.permanentlyDeletedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-ministries"] });
      closeDeleteDialog();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToSave'),
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
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('sidebar.deletedAccounts')}
          description={t('deletedAccounts.description')}
        />

        <Section
          title={t('deletedAccounts.archivedMinistries')}
          description={t('deletedAccounts.archivedDesc')}
          noPadding
        >
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sortedArchives && sortedArchives.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={t('churches.ministryName')} sortKey="churchName" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableTableHead label={t('forms.location')} sortKey="churchLocation" sortConfig={sortConfig} onSort={requestSort} />
                  <TableHead className="text-center">{t('deletedAccounts.backedUpData')}</TableHead>
                  <SortableTableHead label={t('deletedAccounts.deletedBy')} sortKey="deletedByRole" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableTableHead label={t('deletedAccounts.deletedOn')} sortKey="archivedAt" sortConfig={sortConfig} onSort={requestSort} />
                  <TableHead className="text-right">{t('forms.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedArchives.map((archive) => {
                  const stats = getBackupStats(archive);
                  return (
                    <TableRow key={archive.id} data-testid={`row-archive-${archive.id}`}>
                      <TableCell className="font-medium text-sm">{archive.churchName}</TableCell>
                      <TableCell>
                        {archive.churchLocation && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {archive.churchLocation}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {stats.users} {t('deletedAccounts.users')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {stats.converts} {t('deletedAccounts.converts')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {archive.deletedByRole === "ADMIN" ? t('roles.platformAdmin') : t('roles.ministryAdmin')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
                              <p>{t('deletedAccounts.viewBackupDetails')}</p>
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
                              <p>{t('common.restore')}</p>
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
                              <p>{t('deletedAccounts.deletePermanently')}</p>
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
              <h3 className="text-sm font-semibold mb-2">{t('deletedAccounts.noDeletedAccounts')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('deletedAccounts.emptyDesc')}
              </p>
            </div>
          )}
        </Section>
      </div>

      <Dialog open={viewDetailsOpen} onOpenChange={(open) => !open && closeViewDetails()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('deletedAccounts.backupDetails')}</DialogTitle>
            <DialogDescription>
              {t('deletedAccounts.backupDetailsDesc', { name: selectedArchive?.churchName })}
            </DialogDescription>
          </DialogHeader>
          {selectedArchive && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('churches.ministryName')}</p>
                  <p className="text-sm font-medium">{selectedArchive.churchName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('forms.location')}</p>
                  <p className="text-sm font-medium">{selectedArchive.churchLocation || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('deletedAccounts.deletedBy')}</p>
                  <Badge variant="outline">
                    {selectedArchive.deletedByRole === "ADMIN" ? t('roles.platformAdmin') : t('roles.ministryAdmin')}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('deletedAccounts.deletedOn')}</p>
                  <p className="text-sm font-medium">{format(new Date(selectedArchive.archivedAt), "PPP")}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('deletedAccounts.backedUpData')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const stats = getBackupStats(selectedArchive);
                    return (
                      <>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{stats.users} {t('deletedAccounts.users')}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{stats.converts} {t('deletedAccounts.converts')}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{stats.newMembers} {t('deletedAccounts.newMembersGuests')}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{stats.members} {t('deletedAccounts.members')}</span>
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
              {t('forms.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reinstateDialogOpen} onOpenChange={(open) => !open && closeReinstateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deletedAccounts.restoreTitle')}</DialogTitle>
            <DialogDescription>
              {t('deletedAccounts.restoreDesc', { name: selectedArchive?.churchName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeReinstateDialog}
              data-testid="button-cancel-reinstate"
            >
              {t('forms.cancel')}
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
                  {t('deletedAccounts.restoring')}
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  {t('common.restore')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('deletedAccounts.permanentDeleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deletedAccounts.permanentDeleteDesc', { name: selectedArchive?.churchName })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('deletedAccounts.typeDeletePermanently')}
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
              {t('forms.cancel')}
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
                  {t('deletedAccounts.deleting')}
                </>
              ) : (
                t('deletedAccounts.deletePermanently')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
