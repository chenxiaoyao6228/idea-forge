import React, { useRef } from "react";
import Typed from "typed.js";
import { useTranslation } from "react-i18next";

export default function Slogan() {
  const { t } = useTranslation();
  const el = useRef(null);

  React.useEffect(() => {
    const typed = new Typed(el.current, {
      strings: [t("Your AI-powered writing and collaborative editing tools!")],
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
  }, [t]);

  return <p className="inline-block whitespace-nowrap leading-7 [&:not(:first-child)]:mt-1 text-lg min-h-[1rem]" ref={el}></p>;
}
