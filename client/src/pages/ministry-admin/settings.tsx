import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { MapPin, AlertTriangle, Loader2, Trash2, Upload, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface Church {
  id: string;
  name: string;
  location: string | null;
  logoUrl: string | null;
  createdAt: string;
  publicToken: string;
  newMemberToken: string | null;
  memberToken: string | null;
}

interface LeaderQuota {
  currentCount: number;
  maxAllowed: number;
  remaining: number;
  canAddMore: boolean;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/png",
      1
    );
  });
}

export default function MinistryAdminSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { data: church, isLoading } = useQuery<Church>({
    queryKey: ["/api/ministry-admin/church"],
  });

  const { data: leaderQuota, isLoading: isLoadingQuota } = useQuery<LeaderQuota>({
    queryKey: ["/api/ministry-admin/leader-quota"],
  });

  const { uploadFile } = useUpload({
    onSuccess: async (response) => {
      try {
        await apiRequest("PATCH", "/api/ministry-admin/church/logo", {
          logoUrl: response.objectPath,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/church"] });
        toast({
          title: t('settings.logoUpdated'),
          description: t('settings.logoUpdatedDesc'),
        });
      } catch (error) {
        toast({
          title: t('common.error'),
          description: t('settings.failedToSaveLogo'),
          variant: "destructive",
        });
      } finally {
        setIsUploadingLogo(false);
      }
    },
    onError: () => {
      toast({
        title: t('settings.uploadFailed'),
        description: t('settings.uploadFailedDesc'),
        variant: "destructive",
      });
      setIsUploadingLogo(false);
    },
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/ministry-admin/church/logo", { logoUrl: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-admin/church"] });
      toast({
        title: t('settings.logoRemoved'),
        description: t('settings.logoRemovedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('settings.failedToRemoveLogo'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/ministry-admin/church/cancel");
    },
    onSuccess: () => {
      toast({
        title: t('settings.accountCancelled'),
        description: t('settings.accountCancelledDesc'),
      });
      queryClient.clear();
      closeDeleteDialog();
      setTimeout(() => {
        logout();
        navigate("/");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('settings.failedToCancelAccount'),
        variant: "destructive",
      });
    },
  });

  const openDeleteDialog = () => {
    setDeleteStep(1);
    setConfirmText("");
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteStep(1);
    setConfirmText("");
  };

  const handleDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleDeleteConfirm = () => {
    if (confirmText === "Cancel Account") {
      deleteMutation.mutate();
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t('settings.invalidFile'),
        description: t('settings.selectImageFile'),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('settings.fileTooLarge'),
        description: t('settings.fileTooLargeDesc'),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    
    e.target.value = "";
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploadingLogo(true);
      setCropDialogOpen(false);

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "church-logo.png", { type: "image/png" });
      
      await uploadFile(croppedFile);
      setImageSrc(null);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('settings.failedToCropImage'),
        variant: "destructive",
      });
      setIsUploadingLogo(false);
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageSrc(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title={t('settings.ministrySettings')}
          description={t('settings.description')}
        />

        <Section title={t('settings.ministryInformation')} description={t('settings.ministryInformationDesc')}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t('churches.ministryName')}</p>
              <p className="text-sm font-medium">{church?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('forms.location')}</p>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium">{church?.location || t('settings.notSpecified')}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('forms.createdAt')}</p>
              <p className="text-sm font-medium">
                {church?.createdAt ? format(new Date(church.createdAt), "PPP") : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('forms.status')}</p>
              <Badge variant="secondary">{t('common.active')}</Badge>
            </div>
          </div>
        </Section>

        <Section title={t('settings.uploadLogo')} description={t('settings.uploadLogoDesc')}>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50 shrink-0">
              {church?.logoUrl ? (
                <img
                  src={church.logoUrl}
                  alt={`${church.name} logo`}
                  className="w-full h-full object-cover"
                  data-testid="img-church-logo"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="admin-logo-upload">
                <input
                  id="admin-logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploadingLogo}
                  data-testid="input-logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingLogo}
                  onClick={() => document.getElementById("admin-logo-upload")?.click()}
                  data-testid="button-upload-logo"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settings.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t('settings.uploadLogo')}
                    </>
                  )}
                </Button>
              </label>

              {church?.logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeLogo.mutate()}
                  disabled={removeLogo.isPending}
                  data-testid="button-remove-logo"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('settings.removeLogo')}
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                {t('settings.logoRecommendation')}
              </p>
            </div>
          </div>
        </Section>

        <Section title={t('settings.leaderQuota')} description={t('settings.leaderQuotaDesc')}>
          {isLoadingQuota ? (
            <Skeleton className="h-20 w-full" />
          ) : leaderQuota ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{t('settings.currentLeaders')}</p>
                  <p className="text-2xl font-bold" data-testid="text-current-leaders">
                    {leaderQuota.currentCount}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{t('settings.maximumAllowed')}</p>
                  <p className="text-2xl font-bold" data-testid="text-max-leaders">
                    {leaderQuota.maxAllowed}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{t('settings.remainingSlots')}</p>
                  <p className="text-2xl font-bold" data-testid="text-remaining-leaders">
                    {leaderQuota.remaining}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={leaderQuota.canAddMore ? "secondary" : "destructive"}>
                  {leaderQuota.canAddMore 
                    ? t('settings.slotsAvailable', { count: leaderQuota.remaining })
                    : t('settings.noSlotsAvailable')}
                </Badge>
                {!leaderQuota.canAddMore && (
                  <span className="text-xs text-muted-foreground">
                    {t('settings.removeLeaderToAdd')}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </Section>

        <Section title={t('settings.dangerZone')} description={t('settings.dangerZoneDesc')} className="border-destructive/50">
          <div className="flex items-start justify-between gap-4 flex-wrap p-4 border border-destructive/30 rounded-md bg-destructive/5">
            <div>
              <h3 className="text-sm font-medium text-destructive">{t('churches.cancelMinistry')}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.cancelAccountDesc')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={openDeleteDialog}
              data-testid="button-cancel-account"
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.cancelAccount')}
            </Button>
          </div>
        </Section>
      </div>

      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.adjustLogo')}</DialogTitle>
            <DialogDescription>
              {t('settings.adjustLogoDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative h-64 w-full bg-muted rounded-md overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">{t('settings.zoom')}</label>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                data-testid="slider-zoom"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleCropCancel}>
                {t('forms.cancel')}
              </Button>
              <Button onClick={handleCropSave} data-testid="button-save-crop">
                {t('forms.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {deleteStep === 1 ? t('churches.cancelMinistry') : t('churches.confirmCancellation')}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 1 ? (
                <>
                  {t('settings.cancelAccountConfirm', { name: church?.name })}
                </>
              ) : (
                <>
                  {t('settings.cancelAccountTypeConfirm')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteStep === 2 && (
            <div className="py-4">
              <Input
                placeholder={t('settings.typeCancelAccount')}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                data-testid="input-confirm-cancel"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              data-testid="button-cancel-delete"
            >
              {t('settings.goBack')}
            </Button>
            {deleteStep === 1 ? (
              <Button
                variant="destructive"
                onClick={handleDeleteStep1}
                data-testid="button-proceed-delete"
              >
                {t('settings.yesCancelAccount')}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={confirmText !== "Cancel Account" || deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.cancelling')}
                  </>
                ) : (
                  t('churches.confirmCancellation')
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
