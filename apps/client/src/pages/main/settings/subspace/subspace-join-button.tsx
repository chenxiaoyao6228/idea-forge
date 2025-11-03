import { useTranslation } from "react-i18next";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Check, UserPlus, Loader2 } from "lucide-react";
import { useJoinSubspace, useRequestToJoinSubspace } from "@/stores/subspace-store";
import useUserStore from "@/stores/user-store";
import { SubspaceType } from "@idea/contracts";

interface SubspaceJoinButtonProps {
  subspaceId: string;
  subspaceType: SubspaceType;
  isUserMember: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  onJoinSuccess?: () => void;
}

export function SubspaceJoinButton({
  subspaceId,
  subspaceType,
  isUserMember,
  className,
  size = "sm",
  variant = "outline",
  onJoinSuccess,
}: SubspaceJoinButtonProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserStore();
  const { run: joinSubspace, loading: isJoining } = useJoinSubspace();
  const { run: requestToJoinSubspace, loading: isRequesting } = useRequestToJoinSubspace();

  // Don't show button if user is not logged in
  if (!userInfo) {
    return null;
  }

  // If user is already a member, show joined state
  if (isUserMember) {
    return (
      <Button variant="outline" size={size} className={`gap-2 ${className || ""}`} disabled>
        <Check className="h-4 w-4" />
        {t("Joined")}
      </Button>
    );
  }

  // Determine button behavior based on subspace type
  // Note: PRIVATE subspaces are already filtered at API level - users only see them if they're members
  // WORKSPACE_WIDE users are automatically members, so they won't see this button (isUserMember will be true)
  const canJoinDirectly = subspaceType === "PUBLIC";
  const canRequestToJoin = subspaceType === "INVITE_ONLY";

  // If it's WORKSPACE_WIDE, user should already be a member (filtered above)
  // If we reach here with WORKSPACE_WIDE, something is wrong - don't show button
  if (subspaceType === "WORKSPACE_WIDE") {
    return null;
  }

  const handleClick = async () => {
    if (canJoinDirectly) {
      await joinSubspace({ subspaceId });
      onJoinSuccess?.();
    } else if (canRequestToJoin) {
      await requestToJoinSubspace({ subspaceId });
      onJoinSuccess?.();
    }
  };

  const loading = isJoining || isRequesting;
  const buttonLabel = canRequestToJoin ? t("Request") : t("Join");

  return (
    <Button variant={variant} size={size} className={`gap-2 ${className || ""}`} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {buttonLabel}
    </Button>
  );
}
