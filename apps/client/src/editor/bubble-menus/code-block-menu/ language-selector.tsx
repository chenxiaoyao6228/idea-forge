import type React from "react";
import type { Editor } from "@tiptap/react";
import { LANGUAGES_MAP } from "../../extensions/code-block/constant";
import { Button } from '@idea/ui/shadcn/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@idea/ui/shadcn/ui/popover';
import { ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  editor: Editor;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ editor }) => {
  const currentLanguage = editor.getAttributes("codeBlock").language || "none";

  return (
    <div className="flex items-center relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="px-2 h-8 border-none bg-transparent text-sm cursor-pointer"
            onMouseDown={(e) => e.preventDefault()}
          >
            {LANGUAGES_MAP[currentLanguage] || "Plain"}
            <ChevronDown className="h-2 w-2 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2 max-h-[300px] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-1">
            <Button
              key="none"
              size="sm"
              onClick={() => editor.chain().focus().updateAttributes("codeBlock", { language: "none" }).run()}
              onMouseDown={(e) => e.preventDefault()}
              variant={currentLanguage === "none" ? "secondary" : "ghost"}
              tabIndex={-1}
            >
              Plain
            </Button>
            {Object.entries(LANGUAGES_MAP).map(([id, name]) => (
              <Button
                key={id}
                size="sm"
                onClick={() => editor.chain().focus().updateAttributes("codeBlock", { language: id }).run()}
                onMouseDown={(e) => e.preventDefault()}
                variant={currentLanguage === id ? "secondary" : "ghost"}
                tabIndex={-1}
              >
                {name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LanguageSelector;
