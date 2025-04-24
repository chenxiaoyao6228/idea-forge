import type React from "react";
import type { Editor } from "@tiptap/react";
import { LANGUAGES_MAP } from "../../extensions/code-block/constant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LanguageSelectorProps {
  editor: Editor;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ editor }) => {
  const currentLanguage = editor.getAttributes("codeBlock").language || "none";

  return (
    <div className="flex items-center relative">
      <Select
        value={currentLanguage}
        onValueChange={(value) => {
          editor.chain().focus().updateAttributes("codeBlock", { language: value }).run();
        }}
      >
        <SelectTrigger className="px-1 h-8 border-none bg-transparent text-sm">
          <SelectValue defaultValue="none" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Plain</SelectItem>
          {Object.entries(LANGUAGES_MAP).map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
