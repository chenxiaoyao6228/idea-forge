import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useBatchImport } from "@/hooks/use-batch-import";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@idea/ui/shadcn/ui/popover";
import { Loader2, CheckCircle2, AlertCircle, XCircle, ChevronUp, ChevronDown, RotateCw, X } from "lucide-react";
import type { TransferFile } from "@idea/file-transfer";

export const BatchImportStatusBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fileList, summary, retryFailed, cancelFile, clear } = useBatchImport();
  const [showList, setShowList] = useState(false);

  // Don't render if no files
  if (summary.all === 0) {
    return null;
  }

  // Determine overall status
  const getOverallStatus = () => {
    if (summary.failed > 0) return "error";
    if (summary.cancelled > 0) return "cancelled";
    if (summary.progress > 0) return "processing";
    if (summary.success === summary.all) return "success";
    return "idle";
  };

  const status = getOverallStatus();

  const renderStatusContent = () => {
    switch (status) {
      case "processing":
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {t("Importing")} {summary.success}/{summary.all} {t("files")}
            </span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${(summary.success / summary.all) * 100}%` }} />
            </div>
          </div>
        );

      case "error":
        return (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">
              {summary.failed} {t("file(s) failed")}
            </span>
            <Button size="sm" variant="outline" onClick={retryFailed} className="h-7">
              <RotateCw className="h-3 w-3 mr-1" />
              {t("Retry")}
            </Button>
          </div>
        );

      case "cancelled":
        return (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {summary.cancelled} {t("file(s) cancelled")}
            </span>
            <Button size="sm" variant="outline" onClick={retryFailed} className="h-7">
              <RotateCw className="h-3 w-3 mr-1" />
              {t("Retry")}
            </Button>
          </div>
        );

      case "success":
        return (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{t("All files imported successfully")}</span>
          </div>
        );

      default:
        return null;
    }
  };

  const getFileIcon = (file: TransferFile) => {
    switch (file.status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
  };

  const getStatusText = (file: TransferFile) => {
    switch (file.status) {
      case "ready":
        return t("Queued");
      case "uploading":
        return `${t("Uploading")} ${Math.round(file.percent)}%`;
      case "processing":
        return `${t("Processing")} ${Math.round(file.percent)}%`;
      case "complete":
        return t("Completed");
      case "failed":
        return t("Failed");
      case "cancelled":
        return t("Cancelled");
      default:
        return file.status;
    }
  };

  const handleFileClick = (file: TransferFile) => {
    if (file.status === "complete" && file.docId) {
      navigate(`/${file.docId}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover open={showList} onOpenChange={setShowList}>
        <PopoverTrigger asChild>
          <div className="bg-background border rounded-lg shadow-lg">
            <div className="flex items-center gap-3 p-3 pr-2">
              {renderStatusContent()}

              <div className="flex items-center gap-1 ml-2 border-l pl-2">
                <Button size="sm" variant="ghost" onClick={() => setShowList(!showList)} className="h-7 w-7 p-0">
                  {showList ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>

                <Button size="sm" variant="ghost" onClick={clear} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent side="top" align="end" className="w-96 p-0">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">{t("Import Progress")}</h4>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {fileList.map((file) => (
              <div
                key={file.id}
                className={`flex items-start gap-3 p-3 border-b last:border-0 hover:bg-accent/50 ${
                  file.status === "complete" && file.docId ? "cursor-pointer" : ""
                }`}
                onClick={() => handleFileClick(file)}
              >
                <div className="mt-0.5">{getFileIcon(file)}</div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{getStatusText(file)}</div>

                  {["uploading", "processing"].includes(file.status) && (
                    <div className="w-full h-1 mt-2 bg-secondary rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${file.percent}%` }} />
                    </div>
                  )}
                </div>

                {["ready", "uploading", "processing"].includes(file.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelFile(file.id);
                    }}
                    className="h-7 w-7 p-0 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}

                {file.status === "failed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryFailed();
                    }}
                    className="h-7 w-7 p-0 shrink-0"
                  >
                    <RotateCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
