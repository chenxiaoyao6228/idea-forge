import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "./providers/theme-provider";
import { useTranslation } from "react-i18next";

export function ThemeSwitcher() {
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="w-8 h-8" aria-label={t("Toggle theme")}>
          <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>{t("Light")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>{t("Dark")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>{t("System")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
