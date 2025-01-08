import { BubbleMenu, BubbleMenuProps, Editor } from "@tiptap/react";
import Wrapper from "../bubble-menu-wrapper";
import { hasSelectedText } from "../../utils/text";
import BasicMenu from "./basic-menu";
import type { MenuProps } from "../type";
import AlignMenu from "./align-menu";
import ContentTypeMenu from "./content-type-menu";
import SetLinkMenu from "./set-link-menu";

export default function TextMenu(props: MenuProps) {
  const { editor, containerRef } = props;

  if (editor == null) return;

  function shouldShow(editor: Editor) {
    const customTypes = ["codeBlock", "imageBlock", "imageUpload", "horizontalRule", "link", "table", "youtube", "iframe", "excalidraw", "mermaid"];
    if (customTypes.some((type) => editor.isActive(type))) return false;

    return hasSelectedText({ editor });
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, moveTransition: "transform 0.2s ease-out", appendTo: () => containerRef?.current || document.body }}
      updateDelay={100}
      shouldShow={() => shouldShow(editor)}
    >
      <Wrapper>
        <ContentTypeMenu editor={editor} />
        <BasicMenu editor={editor} />
        <SetLinkMenu editor={editor} containerRef={containerRef} />
        <AlignMenu editor={editor} />
      </Wrapper>
    </BubbleMenu>
  );
}
