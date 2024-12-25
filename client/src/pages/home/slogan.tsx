import React, { useRef } from "react";
import Typed from "typed.js";

export default function Slogan() {
  const el = useRef(null);

  React.useEffect(() => {
    const typed = new Typed(el.current, {
      strings: ["Your AI-powered writing and collaborative editing tools!"],
      startDelay: 0, // Set startDelay to 0 to start typing immediately
      typeSpeed: 50,
      backSpeed: 100,
      backDelay: 100,
      cursorChar: "_",
      showCursor: true, // Show cursor
      autoInsertCss: true, // Automatically insert CSS for cursor
    });

    return () => {
      typed.destroy();
    };
  }, []);

  return <p className="inline-block whitespace-nowrap leading-7 [&:not(:first-child)]:mt-1 text-lg min-h-[1rem]" ref={el}></p>;
}
