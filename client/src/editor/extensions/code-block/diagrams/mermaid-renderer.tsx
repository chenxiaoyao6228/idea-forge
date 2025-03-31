/*
 * docs:  https://mermaid.js.org/config/usage.html
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import debounce from "lodash.debounce";
import { v4 as uuidv4 } from "uuid";
import { mermaidTemplates } from "../constant";

let isMermaidInitialized = false;

const cleanupErrorMermaid = () => {
  document
    .querySelectorAll('svg[id^="mermaid-diagram-"][role="graphics-document document"][aria-roledescription="error"]')
    .forEach((element) => element.remove());
};

export function initializeMermaid() {
  if (isMermaidInitialized) return;
  isMermaidInitialized = true;
  const mermaidConfig: Record<string, { useMaxWidth: boolean }> = {};
  mermaidTemplates.forEach((template) => {
    mermaidConfig[template.value] = { useMaxWidth: true };
  });
  mermaid.initialize({ ...mermaidConfig });
}

interface MermaidComponentProps {
  code: string;
}

const MermaidComponent: React.FC<MermaidComponentProps> = ({ code }) => {
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramIdRef = useRef<string>(uuidv4());

  // Debounced render function
  const debouncedRender = debounce(async () => {
    try {
      // https://mermaid.js.org/config/usage.html#api-usage
      const { svg } = await mermaid.render(`mermaid-diagram-${diagramIdRef.current}`, code);
      if (containerRef.current && svg) {
        containerRef.current.innerHTML = svg;
        setError(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while rendering the diagram");
      // FIXME: find a better way to clean up the error SVGs
      //  https://github.com/mermaid-js/mermaid/issues/4730
      setTimeout(() => cleanupErrorMermaid(), 0);
    }
  }, 100);

  // Effect to trigger render on code change
  useEffect(() => {
    initializeMermaid();
    // Prevent error from flashing briefly
    setError(null);
    debouncedRender();
    return () => {
      debouncedRender.cancel();
    };
  }, [code]);

  useEffect(() => {
    cleanupErrorMermaid();
    return () => cleanupErrorMermaid();
  }, []);

  if (error && code.length > 1) {
    return (
      <div className="mermaid-error-wrapper p-4 bg-red-100 border border-red-300 rounded-md">
        <p className="text-red-700 font-semibold">Mermaid Parsing Error:</p>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} id={diagramIdRef.current} className="mermaid-svg-wrapper flex justify-center" />;
};

export default MermaidComponent;
