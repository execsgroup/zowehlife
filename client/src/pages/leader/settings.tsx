import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";

interface ChurchInfo {
  id: string;
  name: string;
  location: string | null;
  logoUrl: string | null;
  publicToken: string | null;
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

export default function LeaderSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { data: church, isLoading } = useQuery<ChurchInfo>({
    queryKey: ["/api/leader/church"],
  });

  const { uploadFile } = useUpload({
    onSuccess: async (response) => {
      try {
        await apiRequest("PATCH", "/api/leader/church/logo", {
          logoUrl: response.objectPath,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/leader/church"] });
        toast({
          title: t('common.success'),
          description: t('settings.passwordUpdated'),
        });
      } catch (error) {
        toast({
          title: t('common.error'),
          description: t('common.failedToSave'),
          variant: "destructive",
        });
      } finally {
        setIsUploadingLogo(false);
      }
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
        variant: "destructive",
      });
      setIsUploadingLogo(false);
    },
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/leader/church/logo", { logoUrl: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leader/church"] });
      toast({
        title: t('common.success'),
        description: t('common.deletedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: t('common.failedToSave'),
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
        description: t('common.failedToSave'),
        variant: "destructive",
      });
      setIsUploadingLogo(false);
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageSrc(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title={t('settings.ministrySettings')}
          description={t('settings.description')}
        />

        <Section title={t('settings.ministrySettings')}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : church ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('settings.churchName')}</p>
                <p className="text-sm font-medium">{church.name}</p>
              </div>

              {church.location && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('settings.location')}</p>
                  <p className="text-sm">{church.location}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('settings.uploadLogo')}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t('settings.description')}
                </p>
                
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                    {church.logoUrl ? (
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
                    <label htmlFor="logo-upload">
                      <input
                        id="logo-upload"
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
                        onClick={() => document.getElementById("logo-upload")?.click()}
                        data-testid="button-upload-logo"
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('forms.saving')}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {t('settings.uploadLogo')}
                          </>
                        )}
                      </Button>
                    </label>

                    {church.logoUrl && (
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
                        {t('forms.remove')}
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {t('settings.logoRecommendation')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('common.failedToLoad')}</p>
          )}
        </Section>
      </div>

      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.uploadLogo')}</DialogTitle>
            <DialogDescription>
              {t('settings.description')}
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
    </DashboardLayout>
  );
}
