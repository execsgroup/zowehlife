import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MmsImageUploadProps {
  onImageUploaded: (publicUrl: string) => void;
  onImageRemoved: () => void;
  currentUrl?: string;
}

export function MmsImageUpload({ onImageUploaded, onImageRemoved, currentUrl }: MmsImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: t('forms.invalidFile'), description: t('forms.selectImageFile'), variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('forms.fileTooLarge'), description: t('forms.imageSizeLimit'), variant: "destructive" });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const urlRes = await fetch("/api/mms-image/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, contentType: file.type }),
      });

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, publicUrl } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image");

      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      onImageUploaded(publicUrl);

      toast({ title: t('forms.imageAttached'), description: t('forms.imageWillBeSent') });
    } catch (error: any) {
      console.error("MMS image upload error:", error);
      toast({ title: t('forms.uploadFailed'), description: error.message || t('forms.couldNotUploadImage'), variant: "destructive" });
      setFileName("");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setFileName("");
    onImageRemoved();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t('forms.imageAttachmentOptional')}</p>
      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt={t('forms.mmsAttachment')}
            className="rounded-md max-h-32 max-w-full object-cover border"
            data-testid="img-mms-preview"
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
            data-testid="button-remove-mms-image"
          >
            <X className="h-3 w-3" />
          </Button>
          {fileName && (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{fileName}</p>
          )}
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-mms-image-file"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="button-attach-mms-image"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('forms.loading')}
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4 mr-2" />
                {t('forms.attachImage')}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">{t('forms.imageSizeInfo')}</p>
        </div>
      )}
    </div>
  );
}
