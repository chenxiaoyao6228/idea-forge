import { LanguageSwitcher } from "@/components/language-switcher";
import Logo from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { Ellipsis } from "lucide-react";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export default function Header() {
  return (
    <div className="text-secondary-foreground fixed top-0 left-0 right-0 h-10 flex">
      <div className="flex-1 text-start p-2">
        <Logo />
      </div>
      <div className="flex-1 text-end p-2">
        <div className="inline-flex items-center">
          <TopBarHandlers />
        </div>
      </div>
    </div>
  );
}

function TopBarHandlers() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Ellipsis className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-42 py-1 px-2" align="end">
        <ThemeSwitcher onSelect={() => setOpen(false)} />
        <Separator className="my-1" />
        <LanguageSwitcher onSelect={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
