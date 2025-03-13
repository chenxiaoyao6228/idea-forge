import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ShareIcon } from "lucide-react";
import { useSharedDocumentStore } from "../../stores/shared-store";
import { Permission } from "shared";
import { useDocumentStore } from "../../stores/doc-store";
import { Select, SelectValue, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import { treeUtils } from "../../util";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function ShareDocButton() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("EDIT");
  const { currentDocShares, loadDocShares, shareDocument, removeShare, updateSharePermission } = useSharedDocumentStore();
  const docTree = useDocumentStore.use.treeData();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const { docId: curDocId } = useParams();
  const isMyDoc = curDocId ? treeUtils.findNode(docTree, curDocId) : null;

  useEffect(() => {
    if (!isMyDoc || !curDocId || !isShareDialogOpen) return;
    loadDocShares(curDocId);
  }, [curDocId, isMyDoc, isShareDialogOpen]);

  const handleShare = async () => {
    if (!curDocId) return;
    await shareDocument({ email, permission, docId: curDocId });
    setEmail("");
  };

  if (!curDocId || !isMyDoc) return null;

  return (
    <Popover open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <ShareIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-950">{t("Share document")}</h2>
            <div className="mt-2 flex gap-2">
              <Input placeholder={t("Enter email address")} value={email} onChange={(e) => setEmail(e.target.value)} />
              <Select value={permission} onValueChange={(value: Permission) => setPermission(value)}>
                <SelectTrigger className="w-[104px]">
                  <SelectValue placeholder={t("Access")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ">{t("Can view")}</SelectItem>
                  <SelectItem value="EDIT">{t("Can edit")}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleShare}>{t("Share")}</Button>
            </div>
          </div>

          {currentDocShares.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-950">{t("Shared users")}</h2>
              {currentDocShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between pb-2">
                  <div className="space-y-1">
                    <div className="font-medium">{share.displayName || share.email}</div>
                    <div className="text-sm text-gray-500">{share.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={share.permission} onValueChange={(value: Permission) => updateSharePermission(curDocId, share.id, value)}>
                      <SelectTrigger className="w-[104px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ">{t("Can view")}</SelectItem>
                        <SelectItem value="EDIT">{t("Can edit")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeShare(curDocId, share.id)}>
                      {t("Remove")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
