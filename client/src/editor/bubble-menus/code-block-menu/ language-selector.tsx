import type React from "react";
import type { Editor } from "@tiptap/react";
import { LANGUAGES_MAP } from "../../extensions/code-block/constant";
import { ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  editor: Editor;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ editor }) => {
  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    editor.chain().focus().updateAttributes("codeBlock", { language: newLanguage }).run();
  };

  const currentLanguage = editor.getAttributes("codeBlock").language || "none";

  return (
    <div className="flex items-center">
      <select value={currentLanguage} onChange={handleLanguageChange} className="appearance-none bg-transparent text-sm focus:outline-none cursor-pointer mr-2">
        <option value="none">Plain</option>
        {Object.entries(LANGUAGES_MAP).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400" />
    </div>
  );
};

export default LanguageSelector;
