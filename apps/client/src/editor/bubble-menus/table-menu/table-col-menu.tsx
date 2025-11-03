import { CustomBubbleMenu } from "../custom-bubble-menu";
import React, { useCallback } from "react";
import { ArrowLeftToLine, ArrowRightToLine, Trash2 } from "lucide-react";
import Wrapper from "../bubble-menu-wrapper";
import { Button } from "@idea/ui/shadcn/ui/button";
import { isColumnGripSelected } from "./utils";
import { MenuProps } from "../type";
import { useTranslation } from "react-i18next";

function AddColumnBeforeButton({ editor }: { editor: MenuProps["editor"] }) {
  const { t } = useTranslation();
  const onAddColumnBefore = useCallback(() => {
    editor?.chain().focus().addColumnBefore().run();
  }, [editor]);

  return (
    <Button onClick={onAddColumnBefore} size="sm" variant="ghost">
      <ArrowLeftToLine className="w-4 h-4 mr-1" />
      {t("Insert column before")}
    </Button>
  );
}

function AddColumnAfterButton({ editor }: { editor: MenuProps["editor"] }) {
  const { t } = useTranslation();
  const onAddColumnAfter = useCallback(() => {
    editor?.chain().focus().addColumnAfter().run();
  }, [editor]);

  return (
    <Button onClick={onAddColumnAfter} size="sm" variant="ghost">
      <ArrowRightToLine className="w-4 h-4 mr-1" />
      {t("Insert column after")}
    </Button>
  );
}

function DeleteColumnButton({ editor }: { editor: MenuProps["editor"] }) {
  const { t } = useTranslation();
  const onDeleteColumn = useCallback(() => {
    editor?.chain().focus().deleteColumn().run();
  }, [editor]);

  return (
    <Button onClick={onDeleteColumn} size="sm" className="w-full flex justify-start" variant="ghost">
      <Trash2 className="w-4 h-4 mr-1" />
      {t("Delete column")}
    </Button>
  );
}

export const TableColMenu = (props: MenuProps) => {
  const { editor, containerRef } = props;

  const shouldShow = useCallback(({ editor }: { editor: any }) => {
    if (editor == null) return false;
    const { view, state } = editor;
    const { selection } = state;
    if (!state) {
      return false;
    }
    return isColumnGripSelected({ editor, view, state, from: selection.from || 0 });
  }, []);

  if (editor == null) return;

  return (
    <CustomBubbleMenu editor={editor} updateDelay={0} shouldShow={shouldShow} appendTo={() => containerRef?.current || document.body}>
      <Wrapper className="flex-col items-start" menuType="table-menu">
        <AddColumnBeforeButton editor={editor} />
        <AddColumnAfterButton editor={editor} />
        <DeleteColumnButton editor={editor} />
      </Wrapper>
    </CustomBubbleMenu>
  );
};
