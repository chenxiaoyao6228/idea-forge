import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import { TextSelection } from "@tiptap/pm/state";
import type React from "react";
import type { Editor } from "@tiptap/react";
import scrollIntoView from "scroll-into-view-if-needed";

interface TableOfContentProps {
  editor: Editor | null;
  items: TableOfContentDataItem[];
  onInitialNavigation?: (id: string) => void;
}

export const TableOfContent = memo(({ editor, items, onInitialNavigation }: TableOfContentProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  // Common function to handle navigation and scrolling
  const handleNavigation = (id: string, shouldUpdateHash = true) => {
    if (!editor) return;

    const element = editor.view.dom.querySelector(`[data-toc-id="${id}"]`);
    if (!element) return;

    // Set editor selection and focus
    const pos = editor.view.posAtDOM(element, 0);
    const tr = editor.view.state.tr;
    tr.setSelection(new TextSelection(tr.doc.resolve(pos)));
    editor.view.dispatch(tr);
    editor.view.focus();

    // Update URL hash if needed
    if (shouldUpdateHash && history.pushState) {
      history.pushState(null, "", `#${id}`);
    }

    // Smooth scroll to the target element
    scrollIntoView(element, {
      scrollMode: "if-needed",
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });

    // Update active state
    setActiveId(id);
  };

  // Handle initial navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    handleNavigation(hash, false); // Don't update hash on initial load
    if (hash && onInitialNavigation) {
      onInitialNavigation(hash);
    }
  }, [onInitialNavigation]);

  // Must put this after useEditorMount, otherwise two scroll events will be conflicted
  useEffect(() => {
    if (!editor || items.length === 0) return;

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-toc-id");
            if (id) setActiveId(id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -66% 0px", // Adjust observation area
        threshold: 0,
      },
    );

    // Observe all heading elements
    const headings = editor.view.dom.querySelectorAll("[data-toc-id]");
    headings.forEach((heading) => observer.observe(heading));

    return () => {
      headings.forEach((heading) => observer.unobserve(heading));
    };
  }, [editor, items]);

  // Click handler
  const onItemClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    handleNavigation(id);
  };

  if (!editor || items.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-1/2 -translate-y-1/2 right-2 cursor-pointer" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* Trigger */}
      {!isHovered && (
        <div className="bg-background p-2 shadow-lg rounded-lg cursor-pointer">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "h-[2px] mb-2 transition-all duration-200",
                // Set width and padding based on level
                {
                  "w-6 ml-0": item.level === 1,
                  "w-4 ml-1": item.level === 2,
                  "w-3 ml-2": item.level === 3,
                  "w-2 ml-3": item.level > 3,
                },
                // Active state style
                item.id === activeId ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          "fixed top-1/2 -translate-y-1/2 right-0  mr-2 w-60 max-h-[60vh] bg-background rounded-lg shadow-lg p-4 overflow-y-auto custom-scrollbar",
          "transition-all duration-200 ease-in-out",
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none",
        )}
      >
        <div className="flex flex-col text-sm gap-1">
          {items.map((item) => (
            <ToCItem onItemClick={onItemClick} key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
});

const ToCItem = ({ item, onItemClick }: { item: TableOfContentDataItem; onItemClick: (e: React.MouseEvent, id: string) => void }) => {
  return (
    <div
      className={cn(
        "rounded-md transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)]",
        {
          "pl-0": item.level === 1,
          "pl-3.5": item.level === 2,
          "pl-7": item.level === 3,
          "pl-[calc(0.875rem*3)]": item.level > 3,
        },
        "hover:bg-accent/50 dark:hover:bg-accent/25",
        item.isActive ? "bg-accent dark:bg-accent/50" : "bg-transparent",
      )}
    >
      <a
        href={`#${item.id}`}
        onClick={(e) => onItemClick(e, item.id)}
        data-item-index={item.itemIndex}
        className={cn("flex gap-1 no-underline line-clamp-2", {
          "text-primary": item.isActive && !item.isScrolledOver,
          "text-muted-foreground": item.isScrolledOver,
          "text-foreground": !item.isActive && !item.isScrolledOver,
        })}
      >
        <span className="overflow-hidden text-ellipsis">{item.textContent}</span>
      </a>
    </div>
  );
};
