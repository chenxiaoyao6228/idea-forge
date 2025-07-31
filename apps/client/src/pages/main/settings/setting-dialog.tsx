import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, SettingsIcon, Users, Building2, Layers } from "lucide-react";
import { Account } from "./account";
import { Members } from "./members";
import { Subspace } from "./subspace";
import { Workspace } from "./workspace";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export const SettingDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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
    <Tabs defaultValue="profile" className="flex h-full gap-4 overflow-hidden">
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
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("Account")}</h3>
          <Separator />
          <Account />
        </div>
      </TabsContent>
      <TabsContent tabIndex={-1} value="members" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
        <Members />
      </TabsContent>
      <TabsContent tabIndex={-1} value="subspace" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("Subspace")}</h3>
          <Separator />
          <Subspace />
        </div>
      </TabsContent>
      <TabsContent tabIndex={-1} value="workspace" className="mt-0 size-full overflow-y-auto overflow-x-hidden">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("Workspace")}</h3>
          <Separator />
          <Workspace />
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "group/tree-node relative flex w-full items-center py-1 px-2",
            "rounded-lg transition-colors",
            "hover:bg-accent/50 dark:hover:bg-accent/25",
            "text-sm font-normal",
          )}
        >
          <SettingsIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{t("Settings")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="h-5/6 max-h-[800px] max-w-6xl pb-0">{content}</DialogContent>
    </Dialog>
  );
};
