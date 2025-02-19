import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link2 } from "lucide-react";
import { LinkEditBlock } from "../link-menu/link-edit-block";
import { useState } from "react";
import { MenuProps } from "../type";

export default function SetLinkMenu(props: MenuProps) {
  const { editor } = props;
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  const setLink = (url: string, text?: string, openInNewTab?: boolean) => {
    let linkText = text;
    // If no text is selected, use the URL as text
    if (!text) {
      const { from, to } = editor.state.selection;
      linkText = editor.state.doc.textBetween(from, to, " ") || url;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .insertContent({
        type: "text",
        text: linkText,
        marks: [
          {
            type: "link",
            attrs: {
              href: url,
              target: openInNewTab ? "_blank" : "",
            },
          },
        ],
      })
      .setLink({ href: url })
      .run();

    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant={editor.isActive("link") ? "secondary" : "ghost"} tabIndex={-1}>
          <Link2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onInteractOutside={() => setIsOpen(false)}>
        <LinkEditBlock editor={editor} onSetLink={setLink} onClickOutside={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
