import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSubspaceStore, { useJoinSubspace } from "@/stores/subspace-store";
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
  const [isJoining, setIsJoining] = useState(false);
  const { run: joinSubspace } = useJoinSubspace();
  const { userInfo } = useUserStore();

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

  // Handle different subspace types
  const canJoin = subspaceType === "PUBLIC" || subspaceType === "WORKSPACE_WIDE";
  const isInviteOnly = subspaceType === "INVITE_ONLY";
  const isPrivate = subspaceType === "PRIVATE";

  const handleJoin = async () => {
    if (!canJoin || isJoining) return;

    setIsJoining(true);
    try {
      await joinSubspace({ subspaceId });
      toast.success(t("Joined subspace successfully"));
      onJoinSuccess?.();
    } catch (error) {
      console.error("Failed to join subspace:", error);
      toast.error(t("Failed to join subspace"));
    } finally {
      setIsJoining(false);
    }
  };

  const handleRequest = () => {
    // TODO: Implement request to join functionality for INVITE_ONLY and PRIVATE subspaces
    toast.info(t("Request to join functionality coming soon"));
  };

  // For WORKSPACE_WIDE subspaces, users are automatically members, so this shouldn't be shown
  if (subspaceType === "WORKSPACE_WIDE") {
    return null;
  }

  // For INVITE_ONLY subspaces, show request button
  if (isInviteOnly) {
    return (
      <Button variant={variant} size={size} className={`gap-2 ${className || ""}`} onClick={handleRequest} disabled={isJoining}>
        {/* {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} */}
        {t("Request")}
      </Button>
    );
  }

  // For PRIVATE subspaces, show request button
  if (isPrivate) {
    return (
      <Button variant={variant} size={size} className={`gap-2 ${className || ""}`} onClick={handleRequest} disabled={isJoining}>
        {/* {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} */}
        {t("Request")}
      </Button>
    );
  }

  // For PUBLIC subspaces, show join button
  return (
    <Button variant={variant} size={size} className={`gap-2 ${className || ""}`} onClick={handleJoin} disabled={isJoining}>
      {/* {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} */}
      {t("Join")}
    </Button>
  );
}
