import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus } from "lucide-react";
import { MemberSharingTab } from "./member-sharing-tab";
import { GuestSharingTab } from "./guest-sharing-tab";

interface ShareButtonProps {
  documentId: string;
}

export function SharePopover({ documentId }: ShareButtonProps) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 gap-0" align="end">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-[calc(100%-2rem)] grid-cols-2 mx-4 mb-2 mt-2">
            <TabsTrigger value="members" className="px-2 py-1">
              Members
            </TabsTrigger>
            <TabsTrigger value="guests" className="px-2 py-1">
              Guests & Public
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="px-4 pb-2 mt-0">
            <MemberSharingTab documentId={documentId} />
          </TabsContent>

          <TabsContent value="guests" className="px-4 pb-2 mt-0">
            <GuestSharingTab documentId={documentId} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
