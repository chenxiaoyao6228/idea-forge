import type React from "react";
import type { Editor } from "@tiptap/react";
import { LANGUAGES_MAP } from "../../extensions/code-block/constant";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
          <Button size="sm" variant="ghost" className="px-2 h-8 border-none bg-transparent text-sm cursor-pointer">
            {LANGUAGES_MAP[currentLanguage] || "Plain"}
            <ChevronDown className="h-2 w-2 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 max-h-[300px] overflow-y-auto">
          <div className="flex flex-col gap-1">
            <Button
              key="none"
              size="sm"
              onClick={() => editor.chain().focus().updateAttributes("codeBlock", { language: "none" }).run()}
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
