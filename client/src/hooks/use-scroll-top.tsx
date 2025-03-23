import { useState, useEffect, type RefObject } from "react";
import { useDebounce } from "react-use";

// Custom hook to track if page or element has been scrolled past a threshold
export const useScrollTop = (threshold = 10, element?: HTMLElement) => {
  // State to track whether we've scrolled past the threshold
  const [scrolled, setScrolled] = useState(false);
  const [currentScroll, setCurrentScroll] = useState(0);

  // Update current scroll position immediately
  useEffect(() => {
    const handleScroll = () => {
      setCurrentScroll(element ? element.scrollTop : window.scrollY);
    };

    const scrollTarget = element || window;
    scrollTarget.addEventListener("scroll", handleScroll);
    return () => scrollTarget.removeEventListener("scroll", handleScroll);
  }, [element]);

  // Debounce the scrolled state update
  useDebounce(
    () => {
      setScrolled(currentScroll > threshold);
    },
    32, // 32ms debounce delay
    [currentScroll, threshold],
  );

  // Return the scrolled state
  return scrolled;
};
