import { LanguageSwitcher } from "@/components/language-switcher";
import Logo from "@/components/logo";
import { Spacer } from "@/components/spacer";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function HomeNav() {
  return (
    <div className="text-secondary-foreground fixed top-0 left-0 right-0 h-10 flex">
      <div className="flex-1 text-start p-2">
        <Logo />
      </div>
      <div className="flex-1 text-end p-2">
        <div className="inline-flex items-center">
          <ThemeSwitcher />
          <div className="w-1" />
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
