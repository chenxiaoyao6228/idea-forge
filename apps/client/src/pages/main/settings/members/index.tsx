import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupManagementPanel } from "./group-management";
import MemberManagementPanel from "./member-management";
import { GuestCollaboratorPanel } from "./visitor-management";

export const Members = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="members" className="h-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 bg-background text-left sticky top-0 z-10 border-b">
          <TabsTrigger value="members" className="justify-center gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
            {t("Member Management")}
          </TabsTrigger>
          <TabsTrigger value="groups" className="justify-center gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
            {t("Group Management")}
          </TabsTrigger>
          <TabsTrigger value="visitors" className="justify-center gap-2 font-normal data-[state=active]:bg-muted data-[state=active]:font-medium">
            {t("Collaborative Visitors")}
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="members" className="mt-0">
            <MemberManagementPanel />
          </TabsContent>
          <TabsContent value="groups" className="mt-0">
            <GroupManagementPanel />
          </TabsContent>
          <TabsContent value="visitors" className="mt-0">
            <GuestCollaboratorPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
