import { Editor } from "@tiptap/react";
import TextMenu from "./text-menu";
import LinkMenu from "./link-menu";
import type { MenuProps } from "./type";

export default function BubbleMenus(props: MenuProps) {
  const { editor, containerRef } = props;
  return (
    <>
      <TextMenu editor={editor} containerRef={containerRef} />
      <LinkMenu editor={editor} containerRef={containerRef} />
    </>
  );
}
