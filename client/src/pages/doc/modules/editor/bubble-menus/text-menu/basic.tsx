import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Code, Underline, Strikethrough } from "lucide-react";

interface IProps {
  editor: Editor | null;
}

export default function BasicMenu(props: IProps) {
  const { editor } = props;
  if (editor == null) return;

  return (
    <>
      <Button size="sm" onClick={() => editor.chain().focus().toggleBold().run()} variant={editor.isActive("bold") ? "secondary" : "ghost"} tabIndex={-1}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        tabIndex={-1}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} variant={editor.isActive("italic") ? "secondary" : "ghost"} tabIndex={-1}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} variant={editor.isActive("strike") ? "secondary" : "ghost"} tabIndex={-1}>
        <Strikethrough className="h-4 w-4" />
      </Button>
    </>
  );
}
