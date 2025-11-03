import { Languages } from "lucide-react";
import { Button } from '@idea/ui/shadcn/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@idea/ui/shadcn/ui/dropdown-menu';
import { useTranslation } from "react-i18next";
import { LANGUAGE_NAME_MAP } from "@/lib/i18n";

interface LanguageSwitcherProps {
  onSelect?: () => void;
}

export function LanguageSwitcher({ onSelect }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-full justify-start p-2 h-8">
          <Languages className="h-4 w-4" />
          <span>{t("Toggle Language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="left" sideOffset={12}>
        {Object.entries(LANGUAGE_NAME_MAP).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => {
              i18n.changeLanguage(key);
              onSelect?.();
            }}
          >
            {value}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
