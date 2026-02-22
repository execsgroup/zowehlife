import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Convert } from "@shared/schema";
import { Search, UserPlus, Phone, Mail, CalendarPlus, Eye, FileSpreadsheet } from "lucide-react";
import { Link } from "wouter";
import { ConvertScheduleFollowUpDialog } from "@/components/convert-schedule-followup-dialog";
import { useBasePath } from "@/hooks/use-base-path";

const statusColors: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-muted",
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  CONNECTED: "bg-success/10 text-success border-success/20",
  NO_RESPONSE: "bg-coral/10 text-coral border-coral/20",
  NEEDS_PRAYER: "bg-primary/10 text-primary border-primary/20",
  NEEDS_FOLLOWUP: "bg-gold/10 text-gold border-gold/20",
  SCHEDULED_VISIT: "bg-primary/10 text-primary border-primary/20",
  REFERRED: "bg-primary/10 text-primary border-primary/20",
  NOT_COMPLETED: "bg-coral/10 text-coral border-coral/20",
  NEVER_CONTACTED: "bg-muted text-muted-foreground border-muted",
  ACTIVE: "bg-success/10 text-success border-success/20",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

export default function MinistryAdminConverts() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedConvert, setSelectedConvert] = useState<Convert | null>(null);
  const basePath = useBasePath();

  const statusLabels: Record<string, string> = {
    NEW: t('statusLabels.new'),
    SCHEDULED: t('statusLabels.scheduled'),
    CONNECTED: t('statusLabels.connected'),
    NO_RESPONSE: t('statusLabels.notConnected'),
    NEEDS_PRAYER: t('statusLabels.needsPrayer'),
    NEEDS_FOLLOWUP: t('statusLabels.needsFollowUp'),
    SCHEDULED_VISIT: t('statusLabels.scheduledVisit'),
    REFERRED: t('statusLabels.referred'),
    NOT_COMPLETED: t('statusLabels.notCompleted'),
    NEVER_CONTACTED: t('statusLabels.neverContacted'),
    ACTIVE: t('statusLabels.active'),
    IN_PROGRESS: t('statusLabels.inProgress'),
    INACTIVE: t('statusLabels.inactive'),
  };

  const handleScheduleFollowUp = (convert: Convert) => {
    setSelectedConvert(convert);
    setFollowUpDialogOpen(true);
  };

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
              {t('converts.title')}
            </h1>
            <p className="text-muted-foreground">{t('converts.viewAllConverts')}</p>
          </div>
          <Button onClick={async () => {
            const params = new URLSearchParams();
            if (searchQuery) params.set("search", searchQuery);
            const response = await fetch(`/api/ministry-admin/converts/export-excel?${params}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `converts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
          }} variant="outline" className="gap-2" data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4" />
            {t('forms.exportExcel')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('forms.searchPlaceholder')}
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
                      <TableHead>{t('forms.name')}</TableHead>
                      <TableHead>{t('forms.contact')}</TableHead>
                      <TableHead>{t('converts.salvationDecision')}</TableHead>
                      <TableHead>{t('forms.status')}</TableHead>
                      <TableHead>{t('guests.source')}</TableHead>
                      <TableHead className="text-right">{t('forms.actions')}</TableHead>
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
                          {(convert as any).lastFollowupOutcome ? (
                            <Badge className={statusColors[(convert as any).lastFollowupOutcome] || "bg-muted text-muted-foreground"}>
                              {statusLabels[(convert as any).lastFollowupOutcome] || (convert as any).lastFollowupOutcome}
                            </Badge>
                          ) : (
                            <Badge className={statusColors[convert.status] || ""}>
                              {statusLabels[convert.status] || convert.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {convert.selfSubmitted ? t('converts.selfRegistered') : t('converts.addedByLeader')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleScheduleFollowUp(convert)}
                                  data-testid={`button-schedule-followup-${convert.id}`}
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('followUps.scheduleFollowUp')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`${basePath}/converts/${convert.id}`}>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    data-testid={`button-view-convert-${convert.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.view')} {t('converts.convertDetails')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('converts.noConverts')}</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? t('common.tryDifferentSearch') : t('converts.convertsWillAppear')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConvertScheduleFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        convert={selectedConvert}
      />
    </DashboardLayout>
  );
}
