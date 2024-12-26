import React from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/providers/theme-provider";

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

  return (
    <Popover>
      <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>
      <PopoverContent className="p-0 w-full border-none shadow-none">
        <EmojiPicker height={350} theme={pickerTheme} onEmojiClick={(data) => handleIconChange(data)} />
      </PopoverContent>
    </Popover>
  );
};
