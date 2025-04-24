import { useCallback, useState, useEffect } from "react";
import type { NodeSelection } from "@tiptap/pm/state";
import { Button } from "@/components/ui/button";
import { GripVertical, RemoveFormatting, Clipboard, Copy, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { IButtonProps } from "./type";
import copy from "copy-to-clipboard";
import { useTranslation } from "react-i18next";

// Clear formatting button
function ClearFormattingButton({ editor, currentNode, currentNodePos }: IButtonProps) {
  const { t } = useTranslation();
  const resetTextFormatting = useCallback(() => {
    if (editor == null) return;
    const chain = editor.chain();
    chain.setNodeSelection(currentNodePos).unsetAllMarks();
    if (currentNode?.type.name !== "paragraph") {
      chain.setParagraph();
    }
    chain.focus(currentNodePos).run();
  }, [editor, currentNodePos, currentNode?.type.name]);

  return (
    <Button size="sm" variant="ghost" className="justify-start w-full mx-0 px-1" onClick={resetTextFormatting}>
      <RemoveFormatting className="h-4 w-4 mr-1" />
      {t("Clear Formatting")}
    </Button>
  );
}

// Copy button
function CopyButton({ editor, currentNodePos }: IButtonProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const copyNodeToClipboard = useCallback(() => {
    if (editor == null) return;
    editor.chain().setNodeSelection(currentNodePos).run();
    const content = editor.state.selection.content().toJSON();
    copy(JSON.stringify(content));
    editor.commands.focus(currentNodePos);
    toast({
      title: t("Success"),
      description: t("Copied to clipboard"),
    });
  }, [editor, currentNodePos, toast, t]);

  return (
    <Button size="sm" variant="ghost" className="justify-start w-full mx-0 px-1" onClick={copyNodeToClipboard}>
      <Clipboard className="h-4 w-4 mr-1" />
      {t("Copy to Clipboard")}
    </Button>
  );
}

// Duplicate button
function DuplicateButton({ editor, currentNode, currentNodePos }: IButtonProps) {
  const { t } = useTranslation();
  const duplicateNode = useCallback(() => {
    if (editor == null) return;
    editor.commands.setNodeSelection(currentNodePos);

    const { $anchor } = editor.state.selection;
    const selectedNode = $anchor.node(1) || (editor.state.selection as NodeSelection).node;
    const nextPos = currentNodePos + (currentNode?.nodeSize || 0);
    editor.chain().insertContentAt(nextPos, selectedNode.toJSON()).focus(nextPos).run();
  }, [editor, currentNodePos, currentNode?.nodeSize]);

  return (
    <Button size="sm" variant="ghost" className="justify-start w-full mx-0 px-1" onClick={duplicateNode}>
      <Copy className="h-4 w-4 mr-1" />
      {t("Duplicate")}
    </Button>
  );
}

// Delete button
function DeleteButton({ editor, currentNodePos }: IButtonProps) {
  const { t } = useTranslation();
  const deleteNode = useCallback(() => {
    if (editor == null) return;
    editor.chain().setNodeSelection(currentNodePos).deleteSelection().focus(currentNodePos).run();
  }, [editor, currentNodePos]);

  return (
    <Button size="sm" variant="destructive" className="justify-start w-full mx-0 px-1" onClick={deleteNode}>
      <Trash2 className="h-4 w-4 mr-1" />
      {t("Delete")}
    </Button>
  );
}

export default function DragButton(props: IButtonProps) {
  const { editor } = props;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      editor?.commands.setMeta("lockDragHandle", true);
    } else {
      editor?.commands.setMeta("lockDragHandle", false);
    }
  }, [editor, menuOpen]);

  if (editor == null) return null;

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1} className="px-1 cursor-grab">
          <GripVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 flex flex-col w-auto">
        <ClearFormattingButton {...props} />
        <CopyButton {...props} />
        <DuplicateButton {...props} />
        <Separator className="mb-2" />
        <DeleteButton {...props} />
      </PopoverContent>
    </Popover>
  );
}
