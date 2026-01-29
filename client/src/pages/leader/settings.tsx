import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Church, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";

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
          title: "Logo Updated",
          description: "Your church logo has been updated successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save logo. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingLogo(false);
      }
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
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
        title: "Logo Removed",
        description: "Your church logo has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove logo. Please try again.",
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
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 5MB.",
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
        title: "Error",
        description: "Failed to crop image. Please try again.",
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
    <DashboardLayout title="Church Settings">
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Church className="h-5 w-5" />
              Church Information
            </CardTitle>
            <CardDescription>
              Manage your church's profile and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : church ? (
              <>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Church Name</h3>
                  <p className="text-lg font-medium">{church.name}</p>
                </div>

                {church.location && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
                    <p>{church.location}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Church Logo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your church logo. It will be displayed on the Salvation Form for new converts.
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
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Logo
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
                          Remove Logo
                        </Button>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 200x200px, under 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Unable to load church information.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust Your Logo</DialogTitle>
            <DialogDescription>
              Drag to reposition and use the slider to zoom in or out
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative h-64 w-full bg-muted rounded-lg overflow-hidden">
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
              <label className="text-sm font-medium">Zoom</label>
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
                Cancel
              </Button>
              <Button onClick={handleCropSave} data-testid="button-save-crop">
                Save Logo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
