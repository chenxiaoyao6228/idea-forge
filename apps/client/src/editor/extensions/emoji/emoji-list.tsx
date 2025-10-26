import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface EmojiItem {
  name: string;
  emoji: string;
  shortcodes?: string[];
}

interface EmojiListProps {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
}

export interface EmojiListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

/**
 * Simple emoji list component for suggestion menu
 * Displays filtered emojis and handles keyboard navigation
 */
export const EmojiList = forwardRef<EmojiListHandle, EmojiListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="emoji-list overflow-auto rounded-md border border-border bg-popover p-2 shadow-md max-h-[300px] min-w-[250px]">
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            key={index}
            type="button"
            className={`emoji-item flex items-center gap-2 w-full px-3 py-2 text-left rounded-sm transition-colors ${
              index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="text-xl leading-none">{item.emoji}</span>
            <span className="text-sm text-muted-foreground capitalize">{item.name}</span>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">No emojis found</div>
      )}
    </div>
  );
});

EmojiList.displayName = "EmojiList";
