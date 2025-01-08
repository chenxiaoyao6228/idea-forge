import { Editor } from "@tiptap/react";
import { BubbleMenuProps } from "@tiptap/react";
import TextMenu from "./text-menu";

export default function BubbleMenus(props: { editor: Editor }) {
  const { editor } = props;
  return (
    <>
      <TextMenu editor={editor} />
    </>
  );
}
