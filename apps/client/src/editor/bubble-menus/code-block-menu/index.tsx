import { type Editor } from "@tiptap/react";
import { CustomBubbleMenu } from "../custom-bubble-menu";
import Wrapper from "../bubble-menu-wrapper";
import CopyCodeButton from "./copy-code-button";
import LanguageSelector from "./ language-selector";
import MermaidMenu from "./mermaid-menu";
import type { MenuProps } from "../type";
import { useCallback } from "react";
import { getRenderContainer } from "../../utils/getRenderContainer";

export default function CodeBlockMenu(props: MenuProps) {
  const { editor, containerRef } = props;
  if (editor == null) return null;

  const shouldShow = useCallback(({ editor }: { editor: Editor }) => {
    return editor.isActive("codeBlock");
  }, []);

  const getReferenceClientRect = useCallback(() => {
    if (editor == null) return new DOMRect(-1000, -1000, 0, 0);

    const renderContainer = getRenderContainer(editor, "codeBlock");
    const rect = renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0);

    return rect;
  }, [editor]);

  const isMermaid = editor.getAttributes("codeBlock").language === "mermaid";

  return (
    <CustomBubbleMenu
      editor={editor}
      updateDelay={0}
      shouldShow={shouldShow}
      getReferenceClientRect={getReferenceClientRect}
      appendTo={() => containerRef?.current || document.body}
      placement="top"
    >
      <Wrapper>
        <div className="flex items-center space-x-2">
          <CopyCodeButton editor={editor} />
          <div className="w-px h-4 bg-gray-300" />
          <LanguageSelector editor={editor} />
          {isMermaid && (
            <>
              <div className="w-px h-4 bg-gray-300" />
              <MermaidMenu editor={editor} />
            </>
          )}
        </div>
      </Wrapper>
    </CustomBubbleMenu>
  );
}
