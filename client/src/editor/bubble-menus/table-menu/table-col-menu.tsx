import { BubbleMenu } from "@tiptap/react";
import React, { useCallback } from "react";
import { ArrowLeftToLine, ArrowRightToLine, Trash2 } from "lucide-react";
import Wrapper from "../bubble-menu-wrapper";
import { Button } from "@/components/ui/button";
import { isColumnGripSelected } from "./utils";
import { ShouldShowProps, MenuProps } from "../type";

function AddColumnBeforeButton({ editor }: { editor: MenuProps["editor"] }) {
  const onAddColumnBefore = useCallback(() => {
    editor?.chain().focus().addColumnBefore().run();
  }, [editor]);

  return (
    <Button onClick={onAddColumnBefore} size="sm" variant="ghost">
      <ArrowLeftToLine className="w-4 h-4 mr-1" />
      Insert column before
    </Button>
  );
}

function AddColumnAfterButton({ editor }: { editor: MenuProps["editor"] }) {
  const onAddColumnAfter = useCallback(() => {
    editor?.chain().focus().addColumnAfter().run();
  }, [editor]);

  return (
    <Button onClick={onAddColumnAfter} size="sm" variant="ghost">
      <ArrowRightToLine className="w-4 h-4 mr-1" />
      Insert column after
    </Button>
  );
}

function DeleteColumnButton({ editor }: { editor: MenuProps["editor"] }) {
  const onDeleteColumn = useCallback(() => {
    editor?.chain().focus().deleteColumn().run();
  }, [editor]);

  return (
    <Button onClick={onDeleteColumn} size="sm" className="w-full flex justify-start" variant="ghost">
      <Trash2 className="w-4 h-4 mr-1" />
      Delete column
    </Button>
  );
}

export const TableColMenu = (props: MenuProps) => {
  const { editor, containerRef } = props;

  const shouldShow = useCallback(
    ({ view, state, from }: ShouldShowProps) => {
      if (editor == null) return false;
      if (!state) {
        return false;
      }
      return isColumnGripSelected({ editor, view, state, from: from || 0 });
    },
    [editor],
  );

  if (editor == null) return;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableColMenu"
      updateDelay={0}
      shouldShow={shouldShow}
      tippyOptions={{
        offset: [0, 8],
        popperOptions: {
          modifiers: [{ name: "flip", enabled: false }],
        },
        appendTo: () => containerRef?.current || document.body,
      }}
    >
      <Wrapper className="flex-col items-start" menuType="table-menu">
        <AddColumnBeforeButton editor={editor} />
        <AddColumnAfterButton editor={editor} />
        <DeleteColumnButton editor={editor} />
      </Wrapper>
    </BubbleMenu>
  );
};
