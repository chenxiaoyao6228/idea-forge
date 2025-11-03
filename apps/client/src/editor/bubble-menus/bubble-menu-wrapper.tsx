import { cn } from "@idea/ui/shadcn/utils";

export default function BubbleMenuWrapper({
  children,
  className,
  menuType,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  menuType?: string;
}>) {
  const baseClassName = `border rounded p-1 shadow
  bg-background dark:bg-background-dark dark:border-gray-800 dark:shadow-lg
  inline-flex`;

  const conditionalClasses = menuType === "table-menu" ? "" : "space-x-1";

  // Prevent default on mousedown to avoid editor blur when clicking buttons
  // This fixes the flicker issue where the menu hides/shows when clicking
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only prevent default for actual interactive elements (buttons, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], a')) {
      e.preventDefault();
    }
  };

  return (
    <div className={cn(baseClassName, conditionalClasses, className)} onMouseDown={handleMouseDown}>
      {children}
    </div>
  );
}
