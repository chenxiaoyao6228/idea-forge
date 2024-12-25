import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ShareIcon } from "lucide-react";
import { useSharedDocumentStore } from "../shared-store";
import { Permission } from "shared";
import { useDocumentStore } from "../store";
import { Select, SelectValue, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import { treeUtils } from "../util";
import { useParams } from "react-router-dom";

export function ShareDocButton() {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("EDIT");
  const { currentDocShares, loadDocShares, shareDocument, removeShare, updateSharePermission } = useSharedDocumentStore();
  const docTree = useDocumentStore.use.treeData();

  const { docId: curDocId } = useParams();
  const isMyDoc = curDocId ? treeUtils.findNode(docTree, curDocId) : null;

  useEffect(() => {
    if (!isMyDoc || !curDocId) return;
    loadDocShares(curDocId);
  }, [curDocId, isMyDoc]);

  const handleShare = async () => {
    if (!curDocId) return;
    await shareDocument({ email, permission, docId: curDocId });
    setEmail("");
  };

  if (!curDocId || !isMyDoc) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 mr-1">
          <ShareIcon className="w-4 h-4" />
          {currentDocShares.length > 0 ? "Shared" : "Share"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-950">New share</h3>
            <div className="flex gap-2">
              <Input placeholder="User email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
              <Select value={permission} onValueChange={(value: Permission) => setPermission(value)}>
                <SelectTrigger className="w-[104px]">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ">Can view</SelectItem>
                  <SelectItem value="EDIT">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleShare}>Share</Button>
            </div>
          </div>

          {currentDocShares.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-950">{"Shared users"}</h2>
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
                        <SelectItem value="READ">Can view</SelectItem>
                        <SelectItem value="EDIT">Can edit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeShare(curDocId, share.id)}>
                      Remove
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
