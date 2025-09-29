import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { User, Users, Building2, Layers } from "lucide-react";
import { Account } from "@/pages/main/settings/account";
import { Members } from "@/pages/main/settings/members";
import { Subspace } from "@/pages/main/settings/subspace";
import { Workspace } from "@/pages/main/settings/workspace";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { useAbilityCan, Action } from "@/hooks/use-ability";
import useWorkspaceStore from "@/stores/workspace-store";

export interface SettingModalProps {
  // basic info
  title?: string;
  description?: string;
  content?: React.ReactNode;

  // setting specific
  tab?: string;
  subspaceId?: string;

  // react-confirm
  show?: boolean;
  proceed?: (value: any) => void;
}

const SettingModal = ({ show = false, proceed, tab = "profile", subspaceId, content }: ConfirmDialogProps<SettingModalProps, boolean>) => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const workspaceSubject = currentWorkspace ? { id: currentWorkspace.id } : undefined;
  const { can: canManageSubspaces } = useAbilityCan("Workspace", Action.ManageSubspaces, workspaceSubject);
  const { can: canManageWorkspace } = useAbilityCan("Workspace", Action.Manage, workspaceSubject);

  const [activeTab, setActiveTab] = useState(tab);
  const [activeSubspaceId, setActiveSubspaceId] = useState<string | undefined>(subspaceId);

  // Update state when props change
  useEffect(() => {
    if (tab) setActiveTab(tab);
    if (subspaceId !== undefined) setActiveSubspaceId(subspaceId);
  }, [tab, subspaceId]);

  const tabList = useMemo(() => {
    let baseTabs = [
      {
        key: "profile",
        name: t("Account"),
        Icon: User,
      },
      {
        key: "members",
        name: t("Members"),
        Icon: Users,
      },
      {
        key: "workspace",
        name: t("Workspace"),
        Icon: Building2,
      },
      {
        key: "subspaces",
        name: t("Subspaces"),
        Icon: Layers,
      },
    ];

    // Filter out subspaces tab for users without ManageSubspaces permission
    if (!canManageSubspaces) {
      baseTabs = baseTabs.filter((tab) => tab.key !== "subspaces");
    }
    if (!canManageWorkspace) {
      baseTabs = baseTabs.filter((tab) => tab.key !== "members");
    }

    return baseTabs;
  }, [t, canManageSubspaces, canManageWorkspace]);

  const handleClose = () => {
    proceed?.(null);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="h-5/6 max-h-[800px] max-w-6xl pb-0 [&>button]:hidden">
        {content || (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full gap-4 overflow-hidden">
            <TabsList className="grid gap-2 bg-inherit text-left">
              {tabList.map(({ key, name, Icon }) => {
                return (
                  <TabsTrigger key={key} value={key} className="justify-start gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
                    <Icon className="size-5 shrink-0 sm:size-4" />
                    <span className="hidden sm:inline">{name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent tabIndex={-1} value="profile" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
              <Account />
            </TabsContent>
            {canManageWorkspace && (
              <TabsContent tabIndex={-1} value="members" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
                <Members />
              </TabsContent>
            )}
            {canManageSubspaces && (
              <TabsContent tabIndex={-1} value="subspaces" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
                <Subspace activeSubspaceId={activeSubspaceId} />
              </TabsContent>
            )}
            <TabsContent tabIndex={-1} value="workspace" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
              <Workspace />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const showSettingModal = ContextAwareConfirmation.createConfirmation(confirmable(SettingModal));
