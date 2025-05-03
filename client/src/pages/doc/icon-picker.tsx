import React, { lazy, Suspense } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/providers/theme-provider";
import { Theme } from "emoji-picker-react";
import Loading from "@/components/loading";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface IconPickerProps {
  onChange: (icon: string) => void;
  children: React.ReactNode;
  asChild?: boolean;
}

export const IconPicker = ({ onChange, children, asChild }: IconPickerProps) => {
  const { theme } = useTheme();
  const currentTheme = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;

  const themeMap = { dark: Theme.DARK, light: Theme.LIGHT };
  const pickerTheme = themeMap[currentTheme as keyof typeof themeMap];

  /*
   * emoji has cross platform rendering issues, so we need to use the imageUrl
   */
  const handleIconChange = (data: any) => {
    onChange(data.unified);
  };

  const PICKER_SIZE = 350;
  const Fallback = () => (
    // h-[${PICKER_SIZE}px] won't work, so we need to use the inline style
    <div className={`h-[350px] w-[350px] animate-pulse bg-muted border border-border rounded-md`}>
      <Loading />
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>
      <PopoverContent className="p-0 w-full h-full border-none shadow-none">
        <Suspense fallback={<Fallback />}>
          <EmojiPicker height={PICKER_SIZE} theme={pickerTheme} onEmojiClick={(data) => handleIconChange(data)} />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
};
