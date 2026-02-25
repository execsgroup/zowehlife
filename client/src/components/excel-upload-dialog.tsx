import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "converts" | "new-members" | "members" | "guests";
  apiPath: string;
  invalidateKeys: string[];
  expectedColumns: { key: string; label: string; required: boolean }[];
}

interface UploadResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

export function ExcelUploadDialog({
  open,
  onOpenChange,
  entityType,
  apiPath,
  invalidateKeys,
  expectedColumns,
}: ExcelUploadDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast({
          title: t('excelUpload.invalidFileType'),
          description: t('excelUpload.invalidFileTypeDesc'),
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(apiPath + "/bulk-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setResult(data);

      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      if (data.successCount > 0) {
        toast({
          title: t('excelUpload.uploadComplete'),
          description: t('excelUpload.uploadSuccessDesc', {
            count: data.successCount,
            total: data.totalRows,
          }),
        });
      }
    } catch (error: any) {
      toast({
        title: t('excelUpload.uploadFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedFile(null);
      setResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    onOpenChange(open);
  };

  const handleDownloadTemplate = () => {
    const headers = expectedColumns.map((col) => col.label).join(",");
    const blob = new Blob([headers + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid={`dialog-upload-${entityType}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('excelUpload.title')}
          </DialogTitle>
          <DialogDescription>
            {t('excelUpload.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium mb-2">{t('excelUpload.expectedColumns')}</p>
            <div className="flex flex-wrap gap-1">
              {expectedColumns.map((col) => (
                <span
                  key={col.key}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    col.required
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`text-expected-col-${col.key}`}
                >
                  {col.label}{col.required ? " *" : ""}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {t('excelUpload.requiredNote')}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            onClick={handleDownloadTemplate}
            data-testid="button-download-template"
          >
            <Download className="h-3.5 w-3.5" />
            {t('excelUpload.downloadTemplate')}
          </Button>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-upload"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
              </div>
            ) : (
              <>
                <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('excelUpload.dropzoneText')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('excelUpload.supportedFormats')}</p>
              </>
            )}
          </div>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{t('excelUpload.successCount', { count: result.successCount })}</span>
                </div>
                {result.errorCount > 0 && (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{t('excelUpload.errorCount', { count: result.errorCount })}</span>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {result.errors.map((err, idx) => (
                    <Alert key={idx} variant="destructive" className="py-1 px-2">
                      <AlertDescription className="text-xs">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {t('excelUpload.rowError', { row: err.row })}: {err.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => handleClose(false)} data-testid="button-cancel-upload">
              {result ? t('forms.close') : t('forms.cancel')}
            </Button>
            {!result && (
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="gap-2"
                data-testid="button-submit-upload"
              >
                <Upload className="h-4 w-4" />
                {uploading ? t('excelUpload.uploading') : t('excelUpload.upload')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
