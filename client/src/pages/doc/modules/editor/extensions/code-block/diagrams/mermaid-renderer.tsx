import type React from "react";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import debounce from "lodash.debounce";
import DOMPurify from "dompurify";
import { mermaidTemplates } from "../constant";
import { v4 as uuidv4 } from "uuid";

// Initialize mermaid
(function initializeMermaid() {
  const mermaidConfig: Record<string, { useMaxWidth: boolean }> = {};
  mermaidTemplates.forEach((template) => {
    mermaidConfig[template.value] = { useMaxWidth: true };
  });
  mermaid.initialize({ ...mermaidConfig });
})();

interface MermaidComponentProps {
  code: string;
}

const MermaidComponent: React.FC<MermaidComponentProps> = ({ code }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramIdRef = useRef<string>(uuidv4());

  // Debounced render function
  const debouncedRender = debounce(async () => {
    try {
      // NOTE: cannot use diagramIdRef.current here, mermaid will somehow destroy the dom
      const { svg } = await mermaid.render(`mermaid-diagram-${diagramIdRef.current}`, code);
      setSvg(svg);
    } catch (error) {
      setSvg("");
      setError(error instanceof Error ? error.message : "An error occurred while rendering the diagram");
    }
  }, 100);

  // Effect to trigger render on code change
  useEffect(() => {
    // Prevent error from flashing briefly
    setError(null);
    debouncedRender();
    return () => {
      debouncedRender.cancel();
    };
  }, [code]);

  if (error && code.length > 1) {
    return (
      <div className="mermaid-error-wrapper p-4 bg-red-100 border border-red-300 rounded-md">
        <p className="text-red-700 font-semibold">Mermaid Parsing Error:</p>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id={diagramIdRef.current}
      // NOTE: DOMPurify v3.1.7 breaks Mermaid. see: https://github.com/facebook/docusaurus/issues/10526
      // biome-ignore lint/security/noDangerouslySetInnerHtml: <the svg is sanitized>
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg) }}
      className="mermaid-svg-wrapper flex justify-center"
    />
  );
};

export default MermaidComponent;
