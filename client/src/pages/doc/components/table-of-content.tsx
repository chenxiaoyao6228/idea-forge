import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { TableOfContentDataItem } from "@tiptap-pro/extension-table-of-contents";
import { TextSelection } from "@tiptap/pm/state";
import type React from "react";
import { useEditorStore } from "../stores/editor-store";

export const TableOfContent = memo(() => {
  const [isHovered, setIsHovered] = useState(false);
  const items = useEditorStore((state) => state.tocItems);
  const editor = useEditorStore((state) => state.editor);

  if (!editor || items.length === 0) {
    return null;
  }

  const onItemClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();

    if (editor) {
      const element = editor.view.dom.querySelector(`[data-toc-id="${id}"`);
      if (element) {
        const pos = editor.view.posAtDOM(element, 0);

        // set focus
        const tr = editor.view.state.tr;

        tr.setSelection(new TextSelection(tr.doc.resolve(pos)));

        editor.view.dispatch(tr);

        editor.view.focus();

        if (history.pushState) {
          history.pushState(null, "", `#${id}`);
        }

        const rect = element.getBoundingClientRect();
        console.log("element position:", rect);
        // FIXME: window.scrollTo is not working in this case
        // window.scrollTo({
        //   top: rect.top + window.scrollY,
        //   behavior: 'smooth',
        // });
        element.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      }
    }
  };

  return (
    <div className="fixed top-[40%] right-2 cursor-pointer" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* Trigger */}
      {!isHovered && (
        <div className="bg-background p-2 shadow-lg rounded-lg cursor-pointer">
          {firstLevelItems.map((item) => (
            <div className="h-1 w-4 bg-primary mb-1" key={item.id}></div>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          "absolute right-full top-0 mr-2 w-80 max-h-[90vh] bg-background rounded-lg shadow-lg p-4 overflow-y-auto",
          "transition-all duration-200 ease-in-out",
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none",
        )}
      >
        <div className="flex flex-col text-sm gap-1 mt-2">
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
          // Dynamic padding based on level
          "pl-0": item.level === 1,
          "pl-3.5": item.level === 2,
          "pl-7": item.level === 3,
          "pl-[calc(0.875rem*3)]": item.level > 3,
        },
        "hover:bg-secondary",
      )}
    >
      <a
        href={`#${item.id}`}
        onClick={(e) => onItemClick(e, item.id)}
        data-item-index={item.itemIndex}
        className={cn("flex gap-1 no-underline", "before:content-[attr(data-item-index)'.']", {
          "text-primary": item.isActive && !item.isScrolledOver,
          "text-muted-foreground": item.isScrolledOver,
          "text-foreground": !item.isActive && !item.isScrolledOver,
        })}
      >
        {item.textContent}
      </a>
    </div>
  );
};
