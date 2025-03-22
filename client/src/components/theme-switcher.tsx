import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "./providers/theme-provider";
import { useTranslation } from "react-i18next";

interface ThemeSwitcherProps {
  onSelect?: () => void;
}

export function ThemeSwitcher({ onSelect }: ThemeSwitcherProps) {
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  const handleSelect = (theme: "light" | "dark" | "system") => {
    setTheme(theme);
    onSelect?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-full justify-start p-2 h-8" aria-label={t("Toggle theme")}>
          <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span>{t("Toggle theme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="left" sideOffset={12}>
        <DropdownMenuItem onClick={() => handleSelect("light")}>{t("Light")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("dark")}>{t("Dark")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("system")}>{t("System")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
