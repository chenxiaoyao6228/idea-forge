import { TextSelection } from "@tiptap/pm/state";
import { CustomBubbleMenu } from "../custom-bubble-menu";
import { useState, useEffect, useMemo } from "react";
import { LinkEditBlock } from "./link-edit-block";
import { LinkViewBlock } from "./link-view-block";
import type { MenuProps } from "../type";

export default function LinkMenu({ editor, containerRef }: MenuProps) {
  const [showEdit, setShowEdit] = useState(false);

  const shouldShow = useMemo(
    () =>
      ({ editor }: { editor: any }) => {
        if (!editor) return false;
        return editor.isActive("link") && editor.state.selection.empty;
      },
    [],
  );

  const { href, target } = editor?.getAttributes("link") || {};

  function setLink(url: string, text?: string, openInNewTab?: boolean) {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .insertContent({
        type: "text",
        text: text,
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
      .setLink({ href: url, target: openInNewTab ? "_blank" : "" })
      .run();
    setShowEdit(false);
  }

  function removeLink() {
    if (!editor) return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowEdit(false);
  }

  function onClickOutside() {
    if (!editor) return;
    const { state, view } = editor;
    const { tr, selection } = state;
    const transaction = tr.setSelection(TextSelection.create(state.doc, selection.from));
    view.dispatch(transaction);
    setShowEdit(false);
  }

  useEffect(() => {
    if (!editor) return;

    function handleUpdate() {
      const { href: currentHref } = editor?.getAttributes("link") || {};
      if (currentHref && currentHref !== href) setShowEdit(false);
    }

    editor.on("transaction", handleUpdate);
    return () => {
      editor.off("transaction", handleUpdate);
    };
  }, [editor, href]);

  if (!editor) return null;

  return (
    <CustomBubbleMenu
      editor={editor}
      updateDelay={0}
      shouldShow={shouldShow}
      appendTo={() => containerRef?.current || document.body}
      onHidden={() => setShowEdit(false)}
    >
      {showEdit ? (
        <LinkEditBlock editor={editor} onSetLink={setLink} onClickOutside={onClickOutside} />
      ) : (
        <LinkViewBlock editor={editor} link={href} onClear={removeLink} onEdit={() => setShowEdit(true)} />
      )}
    </CustomBubbleMenu>
  );
}
