import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Mail, Phone, Calendar } from "lucide-react";
import type { ContactRequest } from "@shared/schema";
import { useApiBasePath } from "@/hooks/use-api-base-path";

export default function LeaderContactRequests() {
  const { t } = useTranslation();
  const apiBasePath = useApiBasePath();
  const { data: requests, isLoading } = useQuery<ContactRequest[]>({
    queryKey: [`${apiBasePath}/contact-requests`],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('sidebar.contactRequests')}
          description={t('contactRequests.description')}
        />

        <Section noPadding>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('forms.name')}</TableHead>
                    <TableHead>{t('forms.description')}</TableHead>
                    <TableHead>{t('forms.contact')}</TableHead>
                    <TableHead>{t('forms.date')}</TableHead>
                    <TableHead>{t('forms.notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-contact-${request.id}`}>
                      <TableCell className="font-medium">{request.name}</TableCell>
                      <TableCell>{request.subject}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{request.email}</span>
                          </div>
                          {request.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{request.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(request.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.message}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('contactRequests.title')}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {t('contactRequests.description')}
              </p>
            </div>
          )}
        </Section>
      </div>
    </DashboardLayout>
  );
}
