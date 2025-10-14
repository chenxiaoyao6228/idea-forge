import { useEffect, useRef, type ReactNode } from "react";
import { useInView } from "react-intersection-observer";

interface ViewportTrackerProps {
  /**
   * The notification ID to track
   */
  notificationId: string;
  /**
   * Whether this notification is already viewed
   */
  isViewed: boolean;
  /**
   * Callback when notification has been visible for the required duration
   */
  onMarkViewed: (notificationId: string) => void;
  /**
   * Duration in milliseconds to wait before marking as viewed (default: 2000ms)
   */
  viewDuration?: number;
  /**
   * Children to render
   */
  children: ReactNode;
}

/**
 * ViewportTracker component that automatically marks notifications as viewed
 * when they are visible in the viewport for a specified duration.
 *
 * Uses Intersection Observer API to detect visibility and a timer to ensure
 * continuous visibility for the required duration.
 */
export function ViewportTracker({ notificationId, isViewed, onMarkViewed, viewDuration = 1000, children }: ViewportTrackerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMarkedRef = useRef(false);

  // Use Intersection Observer to detect when element enters/leaves viewport
  const { ref, inView } = useInView({
    threshold: 0.5, // Element must be at least 50% visible
    triggerOnce: false, // Continue tracking even after first visibility
  });

  useEffect(() => {
    // Don't track if already viewed or already marked
    if (isViewed || hasMarkedRef.current) {
      return;
    }

    if (inView) {
      // Element is visible - start timer
      timerRef.current = setTimeout(() => {
        // Mark as viewed after continuous visibility for viewDuration
        onMarkViewed(notificationId);
        hasMarkedRef.current = true;
      }, viewDuration);
    } else {
      // Element is not visible - clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [inView, isViewed, notificationId, onMarkViewed, viewDuration]);

  return <div ref={ref}>{children}</div>;
}
