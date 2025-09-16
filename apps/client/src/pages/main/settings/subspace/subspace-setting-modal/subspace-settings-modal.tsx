import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Users, Shield, UserPlus } from "lucide-react";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { SubspaceSettingsResponse, UpdateSubspaceSettingsRequest } from "@idea/contracts";
import useSubspaceStore from "@/stores/subspace";
import useUserStore from "@/stores/user";
import useWorkspaceStore from "@/stores/workspace";
import { toast } from "sonner";
import { BasicInfoTab } from "./basic-info-tab";
import { MembersPermissionsTab } from "./members-permissions-tab";
import { SecurityTab } from "./security-tab";
import { SubspaceJoinButton } from "@/components/subspace-join-button";

export interface SubspaceSettingsModalProps {
  // basic info
  title?: string;
  description?: string;
  content?: React.ReactNode;

  // setting specific
  subspaceId: string;
  workspaceId: string;

  // react-confirm
  show?: boolean;
  proceed?: (value: any) => void;
}

const SubspaceSettingsModal = ({
  show = false,
  proceed,
  title = "Subspace Settings",
  description,
  subspaceId,
  workspaceId,
  content,
}: ConfirmDialogProps<SubspaceSettingsModalProps, boolean>) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("basic");
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { subspaceSettings, isSettingsLoading, fetchSubspaceSettings, updateSubspaceSettings, clearSubspaceSettings, entities, joinSubspace, fetchList } =
    useSubspaceStore();
  const { userInfo } = useUserStore();
  const { currentWorkspace } = useWorkspaceStore();

  // Get subspace name from store
  const subspaceName = entities[subspaceId]?.name || "Subspace";

  // Check if current user is already a member of the subspace
  const isUserMember = React.useMemo(() => {
    if (!subspaceSettings || !userInfo) return false;
    return subspaceSettings.subspace.members?.some((member) => member.userId === userInfo.id) || false;
  }, [subspaceSettings, userInfo]);

  // Load settings when modal opens
  useEffect(() => {
    if (show && subspaceId) {
      loadSettings();
    }
  }, [show, subspaceId]);

  // Clear settings when modal closes
  useEffect(() => {
    if (!show) {
      clearSubspaceSettings();
    }
  }, [show, clearSubspaceSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      await fetchSubspaceSettings(subspaceId);
    } catch (error) {
      console.error("Failed to load subspace settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = async (changes: Partial<SubspaceSettingsResponse["subspace"]>) => {
    if (!subspaceSettings) return;

    // Update local state optimistically
    const updatedSettings = {
      ...subspaceSettings,
      subspace: {
        ...subspaceSettings.subspace,
        ...changes,
      },
    };

    // Update store state immediately for UI responsiveness
    useSubspaceStore.setState({ subspaceSettings: updatedSettings });

    // Sync to backend
    try {
      const response = await updateSubspaceSettings(subspaceId, changes as UpdateSubspaceSettingsRequest);
      // Update with the actual response from server
      useSubspaceStore.setState({ subspaceSettings: response });
    } catch (error) {
      console.error("Failed to sync settings to backend:", error);
      // Revert optimistic update on error
      useSubspaceStore.setState({ subspaceSettings });
    }
  };

  const handleClose = () => {
    proceed?.(null);
  };

  if (isLoading || isSettingsLoading) {
    return (
      <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="h-5/6 max-h-[800px] max-w-6xl pb-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("Loading settings...")}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!subspaceSettings) {
    return (
      <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="h-5/6 max-h-[800px] max-w-6xl pb-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive">{t("Failed to load settings")}</p>
              <Button onClick={handleClose} className="mt-4">
                {t("Close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="h-5/6 max-h-[800px] max-w-6xl pb-0 [&>button]:hidden">
        {content || (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5" />
                  <DialogTitle>{subspaceName}</DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  <SubspaceJoinButton
                    subspaceId={subspaceId}
                    subspaceType={subspaceSettings.subspace.type}
                    isUserMember={isUserMember}
                    onJoinSuccess={async () => {
                      // Refresh the settings to update member status
                      await loadSettings();
                      // Also refresh the full subspace list
                      if (currentWorkspace?.id) {
                        await fetchList(currentWorkspace.id);
                      }
                    }}
                  />
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full gap-4 overflow-hidden">
              <TabsList className="grid gap-2 bg-inherit text-left">
                <TabsTrigger value="basic" className="justify-start gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
                  <Home className="size-5 shrink-0 sm:size-4" />
                  <span className="hidden sm:inline">{t("Basic Info")}</span>
                </TabsTrigger>
                <TabsTrigger value="members" className="justify-start gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
                  <Users className="size-5 shrink-0 sm:size-4" />
                  <span className="hidden sm:inline">
                    {t("Members & Permissions")} ({subspaceSettings.subspace.memberCount})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="security" className="justify-start gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
                  <Shield className="size-5 shrink-0 sm:size-4" />
                  <span className="hidden sm:inline">{t("Security")}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent tabIndex={-1} value="basic" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
                <BasicInfoTab subspaceId={subspaceId} onTabChange={setActiveTab} />
              </TabsContent>

              <TabsContent tabIndex={-1} value="members" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
                <MembersPermissionsTab settings={subspaceSettings} onSettingsChange={handleSettingsChange} />
              </TabsContent>

              <TabsContent tabIndex={-1} value="security" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
                <SecurityTab settings={subspaceSettings} onSettingsChange={handleSettingsChange} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const showSubspaceSettingsModal = ContextAwareConfirmation.createConfirmation<SubspaceSettingsModalProps, boolean>(confirmable(SubspaceSettingsModal));
