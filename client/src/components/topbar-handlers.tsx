import { Button } from "@/components/ui/button";
import { Ellipsis, FileDown, FileUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import ExportMarkdownButton from "@/pages/doc/components/export-markdown-button";
import ImportMarkdownButton from "@/pages/doc/components/import-markdown";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export default function TopBarHandlers() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Ellipsis className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-42 py-1 px-2" align="end">
        <ThemeSwitcher />
        <Separator className="my-1" />
        <LanguageSwitcher />
        <Separator className="my-1" />
        <ExportMarkdownButton />
        <Separator className="my-1" />
        <ImportMarkdownButton />
      </PopoverContent>
    </Popover>
  );
}
