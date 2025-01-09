import type React from "react";
import { memo, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import MermaidComponent from "./diagrams/mermaid-renderer";

const CodeBlockView: React.FC<NodeViewProps> = ({ node, updateAttributes, extension }) => {
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // Syntax highlighting logic here
    }
  }, [node.textContent]);

  const isMermaid = node.attrs.language === "mermaid";
  const mermaidDisplay = node.attrs.mermaidDisplay || "split";

  return (
    <NodeViewWrapper className="code-block-wrapper relative bg-gray-100 rounded-md p-2" data-type="codeBlock" data-language={node.attrs.language}>
      <pre
        ref={codeRef}
        className={`text-sm font-mono overflow-x-auto transition-all duration-300 ${
          mermaidDisplay === "code" || mermaidDisplay === "split" ? "h-auto opacity-100" : "h-0 opacity-0 overflow-hidden"
        }`}
      >
        <NodeViewContent as="code" />
      </pre>
      {isMermaid && (mermaidDisplay === "preview" || mermaidDisplay === "split") && <MermaidComponent code={node.textContent} />}
    </NodeViewWrapper>
  );
};

export default memo(CodeBlockView);
