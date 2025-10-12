import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Calendar, Loader2 } from "lucide-react";
import { useGetOrCreatePublicShare, useRevokePublicShare, useUpdateExpiration, usePublicShareByDocId, useFetchPublicShare } from "@/stores/public-share-store";
import { ExpirationDuration } from "@idea/contracts";
import useUserStore from "@/stores/user-store";
import { useCurrentWorkspace } from "@/stores/workspace-store";
import { useIsGuestCollaborator } from "@/stores/guest-collaborators-store";

interface PublicSharingSectionProps {
  documentId: string;
}

export function PublicSharingSection({ documentId }: PublicSharingSectionProps) {
  const { t } = useTranslation();
  const currentWorkspaceId = useUserStore((s) => s.userInfo?.currentWorkspaceId);
  const currentWorkspace = useCurrentWorkspace();

  // Get public share from store
  const publicShare = usePublicShareByDocId(documentId);

  // Hooks for API calls
  const { run: fetchPublicShare, loading: fetchLoading } = useFetchPublicShare();
  const { run: createPublicShare, loading: createLoading } = useGetOrCreatePublicShare();
  const { run: revokePublicShare, loading: revokeLoading } = useRevokePublicShare();
  const { run: updateExpiration, loading: updateLoading } = useUpdateExpiration();

  // Fetch public share on mount
  useEffect(() => {
    if (documentId) {
      fetchPublicShare(documentId);
    }
  }, [documentId, fetchPublicShare]);

  // Determine if public sharing is enabled
  const isPublicSharingEnabled = !!publicShare && !publicShare.revokedAt;
  const isLoading = fetchLoading || createLoading || revokeLoading || updateLoading;

  // Check if user has permission to create public shares
  // Only workspace members (OWNER, ADMIN, MEMBER) can create public shares, not guests
  const isGuest = useIsGuestCollaborator();
  const isWorkspacePublicSharingDisabled = currentWorkspace?.allowPublicSharing === false;
  const canCreatePublicShare = !isGuest && !isWorkspacePublicSharingDisabled;

  // Get expiration duration from expiresAt timestamp
  const getExpirationDuration = (): string => {
    if (!publicShare?.expiresAt) {
      return "NEVER";
    }

    const now = new Date();
    const expiresAt = new Date(publicShare.expiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    // Approximate to closest duration
    if (diffHours <= 1.5) return "ONE_HOUR";
    if (diffDays <= 1.5) return "ONE_DAY";
    if (diffDays <= 8) return "ONE_WEEK";
    if (diffDays <= 32) return "ONE_MONTH";
    return "NEVER";
  };

  const handleTogglePublicSharing = async (enabled: boolean) => {
    // Check permission before allowing changes
    if (enabled && !canCreatePublicShare) {
      if (isGuest) {
        toast.error(t("Permission denied"), {
          description: t("Guest members cannot create public share links"),
        });
      } else if (isWorkspacePublicSharingDisabled) {
        toast.error(t("Public sharing disabled"), {
          description: t("Public sharing has been disabled by workspace administrator"),
        });
      }
      return;
    }

    if (!currentWorkspaceId) {
      toast.error(t("Failed to toggle public sharing"), {
        description: t("No workspace selected"),
      });
      return;
    }

    try {
      if (enabled) {
        // Create public share
        await createPublicShare({
          documentId,
          workspaceId: currentWorkspaceId,
          duration: "NEVER" as ExpirationDuration,
        });
      } else {
        // Revoke public share
        if (publicShare) {
          await revokePublicShare({
            id: publicShare.id,
            docId: documentId,
          });
        }
      }
      // Refetch to ensure UI is in sync
      await fetchPublicShare(documentId);
    } catch (error) {
      console.error("Failed to toggle public sharing:", error);
      toast.error(t("Failed to toggle public sharing"));
    }
  };

  const handleExpirationChange = async (value: string) => {
    if (!publicShare) return;

    try {
      await updateExpiration({
        id: publicShare.id,
        docId: documentId,
        duration: value as ExpirationDuration,
      });
      // Refetch to ensure UI is in sync
      await fetchPublicShare(documentId);
    } catch (error) {
      console.error("Failed to update expiration:", error);
      toast.error(t("Failed to update expiration"));
    }
  };

  const copyPublicLink = () => {
    if (!publicShare?.url) {
      toast.error(t("No public link available"));
      return;
    }

    navigator.clipboard.writeText(publicShare.url);
    toast.success(t("Public link copied to clipboard"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Label className="text-sm">{t("Public sharing")}</Label>
          {!canCreatePublicShare && (
            <p className="text-xs text-muted-foreground">
              {isGuest && t("Guest members cannot create public share links")}
              {isWorkspacePublicSharingDisabled && t("Disabled by workspace administrator")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={isPublicSharingEnabled}
            onCheckedChange={handleTogglePublicSharing}
            disabled={isLoading || (!isPublicSharingEnabled && !canCreatePublicShare)}
          />
        </div>
      </div>

      {isPublicSharingEnabled && publicShare && (
        <div className="space-y-4">
          {/* Expire Time */}
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("Expire time")}
            </Label>
            <Select value={getExpirationDuration()} onValueChange={handleExpirationChange} disabled={isLoading}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEVER">{t("Never")}</SelectItem>
                <SelectItem value="ONE_HOUR">{t("1 hour")}</SelectItem>
                <SelectItem value="ONE_DAY">{t("1 day")}</SelectItem>
                <SelectItem value="ONE_WEEK">{t("1 week")}</SelectItem>
                <SelectItem value="ONE_MONTH">{t("1 month")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Copy Public Link */}
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" onClick={copyPublicLink} disabled={isLoading}>
            <Copy className="h-4 w-4" />
            {t("Copy public link")}
          </Button>

          {/* View Count (if any) */}
          {publicShare.views > 0 && (
            <div className="text-xs text-muted-foreground">
              {t("Views")}: {publicShare.views}
              {publicShare.lastAccessedAt && (
                <span className="ml-2">
                  {t("Last accessed")}: {new Date(publicShare.lastAccessedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
