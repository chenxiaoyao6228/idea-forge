import { CustomBubbleMenu } from "../custom-bubble-menu";
import React, { useCallback } from "react";
import { ArrowUpToLine, ArrowDownToLine, Trash2 } from "lucide-react";
import type { MenuProps } from "../type";
import { isRowGripSelected } from "./utils";
import Wrapper from "../bubble-menu-wrapper";
import { Button } from "@idea/ui/shadcn/ui/button";
import { useTranslation } from "react-i18next";

function AddRowBeforeButton({ editor }: { editor: MenuProps["editor"] }) {
  const { t } = useTranslation();
  const onAddRowBefore = useCallback(() => {
    editor?.chain().focus().addRowBefore().run();
  }, [editor]);

  return (
    <Button onClick={onAddRowBefore} size="sm" variant="ghost">
      <ArrowUpToLine className="w-4 h-4 mr-1" />
      {t("Insert row before")}
    </Button>
  );
}

function AddRowAfterButton({ editor }: { editor: MenuProps["editor"] }) {
  const { t } = useTranslation();
  const onAddRowAfter = useCallback(() => {
    editor?.chain().focus().addRowAfter().run();
  }, [editor]);

  return (
    <Button onClick={onAddRowAfter} size="sm" variant="ghost">
      <ArrowDownToLine className="w-4 h-4 mr-1" />
      {t("Insert row after")}
    </Button>
  );
}

function DeleteRowButton({ editor }: { editor: MenuProps["editor"] }) {
  const { t } = useTranslation();
  const onDeleteRow = useCallback(() => {
    editor?.chain().focus().deleteRow().run();
  }, [editor]);

  return (
    <Button onClick={onDeleteRow} size="sm" className="w-full flex justify-start" variant="ghost">
      <Trash2 className="w-4 h-4 mr-1" />
      {t("Delete row")}
    </Button>
  );
}

export const TableRowMenu = (props: MenuProps) => {
  const { editor, containerRef } = props;

  const shouldShow = useCallback(({ editor }: { editor: any }) => {
    if (editor == null) return false;
    const { view, state } = editor;
    const { selection } = state;
    if (!state || !selection.from) {
      return false;
    }
    return isRowGripSelected({ editor, view, state, from: selection.from });
  }, []);

  if (editor == null) return;

  return (
    <CustomBubbleMenu editor={editor} updateDelay={0} shouldShow={shouldShow} placement="left" appendTo={() => containerRef?.current || document.body}>
      <Wrapper className="flex-col items-start" menuType="table-menu">
        <AddRowBeforeButton editor={editor} />
        <AddRowAfterButton editor={editor} />
        <DeleteRowButton editor={editor} />
      </Wrapper>
    </CustomBubbleMenu>
  );
};
