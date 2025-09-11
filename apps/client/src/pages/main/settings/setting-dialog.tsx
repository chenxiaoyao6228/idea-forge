import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { User, Users, Building2, Layers } from "lucide-react";
import { Account } from "./account";
import { Members } from "./members";
import { Subspace } from "./subspace";
import { Workspace } from "./workspace";
import useUIStore from "@/stores/ui";

export const SettingDialog = () => {
  const { t } = useTranslation();
  const { activeSettingDialogTab, isSettingDialogOpen, closeSettingDialog, updateStore } = useUIStore();

  const tabList = useMemo(() => {
    return [
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
        key: "subspace",
        name: t("Subspace"),
        Icon: Layers,
      },
    ];
  }, [t]);

  const content = (
    <Tabs
      value={activeSettingDialogTab}
      onValueChange={(value) => {
        updateStore({ activeSettingDialogTab: value });
      }}
      className="flex h-full gap-4 overflow-hidden"
    >
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
      <TabsContent tabIndex={-1} value="members" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
        <Members />
      </TabsContent>
      <TabsContent tabIndex={-1} value="subspace" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
        <Subspace />
      </TabsContent>
      <TabsContent tabIndex={-1} value="workspace" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
        <Workspace />
      </TabsContent>
    </Tabs>
  );

  return (
    <Dialog open={isSettingDialogOpen} onOpenChange={closeSettingDialog}>
      <DialogTitle className="sr-only">Setting Dialog</DialogTitle>
      <DialogContent className="h-5/6 max-h-[800px] max-w-6xl pb-0">{content}</DialogContent>
    </Dialog>
  );
};
