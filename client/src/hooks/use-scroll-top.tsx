import { useState, useEffect, type RefObject } from "react";

// Custom hook to track if page or element has been scrolled past a threshold
export const useScrollTop = (threshold = 10, element?: HTMLElement) => {
  // State to track whether we've scrolled past the threshold
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Function to handle scroll event
    const handleScroll = () => {
      const currentScrollY = element ? element.scrollTop : window.scrollY;

      // Check if the scroll position is greater than the threshold
      if (currentScrollY > threshold) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Determine which element to attach the scroll listener to
    const scrollTarget = element || window;

    // Add scroll event listener when the component mounts
    scrollTarget.addEventListener("scroll", handleScroll);

    // Cleanup function to remove the event listener when the component unmounts
    return () => scrollTarget.removeEventListener("scroll", handleScroll);
  }, [threshold, element]); // Re-run effect if threshold or element changes

  // Return the scrolled state
  return scrolled;
};
