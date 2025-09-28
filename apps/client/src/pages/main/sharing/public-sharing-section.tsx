import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Globe, Copy, Calendar, MessageSquare } from "lucide-react";

export function PublicSharingSection() {
  const { t } = useTranslation();

  // Self-contained state management
  const [publicSharingEnabled, setPublicSharingEnabled] = React.useState(false);
  const [allowComments, setAllowComments] = React.useState(true);
  const [expireTime, setExpireTime] = React.useState("never");

  const copyPublicLink = () => {
    // TODO: Implement actual public link generation and copying
    navigator.clipboard.writeText("https://app.example.com/public/abc123");
    toast.success(t("Public link copied to clipboard"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">{t("Public sharing")}</Label>
        </div>
        <Switch checked={publicSharingEnabled} onCheckedChange={setPublicSharingEnabled} />
      </div>

      {publicSharingEnabled && (
        <div className="space-y-4">
          {/* Expire Time */}
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("Expire time")}
            </Label>
            <Select value={expireTime} onValueChange={setExpireTime}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t("Never")}</SelectItem>
                <SelectItem value="1hour">{t("1 hour")}</SelectItem>
                <SelectItem value="1day">{t("1 day")}</SelectItem>
                <SelectItem value="1week">{t("1 week")}</SelectItem>
                <SelectItem value="1month">{t("1 month")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Allow Comments */}
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("Allow comments")}
            </Label>
            <Switch checked={allowComments} onCheckedChange={setAllowComments} />
          </div>

          {/* Copy Public Link */}
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" onClick={copyPublicLink}>
            <Copy className="h-4 w-4" />
            {t("Copy public link")}
          </Button>
        </div>
      )}
    </div>
  );
}
