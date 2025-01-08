import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlignCenter, AlignLeft, AlignRight, ChevronDown } from "lucide-react";

interface AlignMenuProps {
  editor: Editor | null;
}

const alignOptions = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
] as const;

export default function AlignMenu({ editor }: AlignMenuProps) {
  if (!editor) return null;

  function handleAlignChange(align: (typeof alignOptions)[number]["value"]) {
    editor?.chain().focus().setTextAlign(align).run();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1}>
          <AlignLeft className="h-4 w-4" />
          <ChevronDown className="h-2 w-2" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-2">
        {alignOptions.map(({ value, icon: Icon }) => (
          <Button
            key={value}
            size="sm"
            onClick={() => handleAlignChange(value)}
            variant={editor.isActive({ textAlign: value }) ? "secondary" : "ghost"}
            tabIndex={-1}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
