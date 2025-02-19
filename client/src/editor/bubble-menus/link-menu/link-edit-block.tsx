import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useClickAway } from "react-use";

interface LinkEditBlockProps {
  editor: Editor;
  onSetLink: (url: string, text?: string, openInNewTab?: boolean) => void;
  onClickOutside: () => void;
}

export function LinkEditBlock({ editor, onSetLink, onClickOutside }: LinkEditBlockProps) {
  const ref = useRef(null);
  useClickAway(ref, onClickOutside);

  const [form, setForm] = useState({
    text: "",
    link: "",
  });
  const [openInNewTab, setOpenInNewTab] = useState(false);

  useEffect(() => {
    const { href, target } = editor.getAttributes("link");
    const { from, to } = editor.state.selection;

    let text = "";
    if (editor.state.selection.empty) {
      // When no selection, get text of the current link node
      const node = editor.state.doc.nodeAt(from);
      text = node?.text || "";
    } else {
      // When there is a selection, get text between selection points
      text = editor.state.doc.textBetween(from, to, " ");
    }

    setForm({
      link: href || "",
      text: text || "",
    });
    setOpenInNewTab(target === "_blank");
  }, [editor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSetLink(form.link, form.text, openInNewTab);
  };

  return (
    <div ref={ref} className="p-2 bg-background rounded-lg shadow-sm border">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid gap-1.5">
          <Label>Text</Label>
          <Input
            type="text"
            value={form.text}
            onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
            required
            className="w-80"
            placeholder="Enter text"
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Link</Label>
          <div className="relative">
            <Input type="url" value={form.link} onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))} required className="pl-10" />
            <span className="absolute left-0 inset-y-0 flex items-center justify-center px-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-1">
          <Checkbox id="openInNewTab" checked={openInNewTab} onCheckedChange={(checked) => setOpenInNewTab(checked as boolean)} />
          <Label htmlFor="openInNewTab">Open in new tab</Label>
        </div>

        <Button type="submit" className="mt-2 self-end">
          Apply
        </Button>
      </form>
    </div>
  );
}
