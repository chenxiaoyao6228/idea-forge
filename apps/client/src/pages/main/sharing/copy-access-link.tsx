import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function CopyAccessLink() {
  const { t } = useTranslation();

  const copyPageAccessLink = () => {
    // Copy the current page URL from the browser address bar
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("Link copied to clipboard"));
  };

  return (
    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md transition-colors" onClick={copyPageAccessLink}>
      <div className="text-sm  flex items-center gap-2 p-1 cursor-pointer">
        <Link className="h-4 w-4" />
        {t("Copy page access link")}
      </div>
    </div>
  );
}
