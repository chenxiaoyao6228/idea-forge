import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "./providers/theme-provider";
import { useTranslation } from "react-i18next";
import { LANGUAGE_NAME_MAP } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="w-8 h-8">
          <Languages className="h-4 w-4" />
          {/* {LANGUAGE_NAME_MAP[i18n.language as keyof typeof LANGUAGE_NAME_MAP]} */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => i18n.changeLanguage("zh")}>Chinese</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
