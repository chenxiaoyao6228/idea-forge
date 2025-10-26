import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef, useCallback } from "react";
import { EmojiCategory, getEmojisByCategory, getCategories } from "./emoji-data";

export interface EmojiItem {
  name: string;
  emoji: string;
  shortcodes?: string[];
}

interface EmojiListProps {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
  query?: string;
}

export interface EmojiListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

/**
 * Enhanced emoji picker with category browsing and grid layout
 * - Grid display for compact viewing
 * - Category tabs for browsing when no search query
 * - Scrollable categories that auto-update selected tab
 * - Search results when user types
 * - Keyboard navigation support
 */
export const EmojiList = forwardRef<EmojiListHandle, EmojiListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<EmojiCategory>(EmojiCategory.Suggested);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Map<EmojiCategory, HTMLDivElement>>(new Map());
  const isUserScrolling = useRef(false);
  const isKeyboardScrolling = useRef(false);

  // Get categories for tabs
  const categories = getCategories();

  // Determine if we should show category tabs or search results
  const hasSearchQuery = props.query && props.query.trim().length > 0;

  // Build all category sections for continuous scrolling
  const allCategorySections = categories.map(({ category }) => ({
    category,
    emojis: getEmojisByCategory(category).map((emoji) => ({
      name: emoji.name,
      emoji: emoji.value,
      shortcodes: [emoji.id],
    })),
  }));

  // Display items - either search results or all emojis from all categories
  const displayItems = hasSearchQuery ? props.items : allCategorySections.flatMap((section) => section.emojis);

  // Handle scroll to update selected category
  const handleScroll = useCallback(() => {
    // Don't update category during keyboard navigation or during programmatic scrolling
    if (!scrollContainerRef.current || hasSearchQuery || isKeyboardScrolling.current || isUserScrolling.current) {
      return;
    }

    const container = scrollContainerRef.current;

    // Find which category is most visible
    let maxVisibleCategory = selectedCategory;
    let maxVisibleArea = 0;

    categoryRefs.current.forEach((element, category) => {
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate visible area of this category
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleArea = Math.max(0, visibleBottom - visibleTop);

      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        maxVisibleCategory = category;
      }
    });

    if (maxVisibleCategory !== selectedCategory) {
      setSelectedCategory(maxVisibleCategory);
    }
  }, [hasSearchQuery, selectedCategory]);

  // Scroll to category when tab is clicked
  const scrollToCategory = useCallback((category: EmojiCategory) => {
    const element = categoryRefs.current.get(category);
    if (element && scrollContainerRef.current) {
      isUserScrolling.current = true;
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setSelectedCategory(category);
      setTimeout(() => {
        isUserScrolling.current = false;
      }, 500);
    }
  }, []);

  // Reset selected index when switching between search and category mode, or when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [hasSearchQuery, props.query]);

  const selectItem = (index: number) => {
    const item = displayItems[index];
    if (item) {
      props.command(item);
    }
  };

  // Scroll selected item into view after state update
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Set flag to prevent handleScroll from updating category during keyboard navigation
    isKeyboardScrolling.current = true;

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      // Find the button element for the selected index
      const buttons = container.querySelectorAll(".emoji-item");
      const selectedButton = buttons[selectedIndex];

      if (selectedButton) {
        selectedButton.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      // Reset flag after scroll animation completes
      setTimeout(() => {
        isKeyboardScrolling.current = false;
      }, 300);
    });
  }, [selectedIndex]);

  const upHandler = () => {
    if (displayItems.length === 0) return;
    const itemsPerRow = 8;
    const newIndex = selectedIndex - itemsPerRow;
    if (newIndex >= 0) {
      setSelectedIndex(newIndex);
    } else {
      // Move to last row, same column
      const column = selectedIndex % itemsPerRow;
      const lastRowStart = Math.floor((displayItems.length - 1) / itemsPerRow) * itemsPerRow;
      const targetIndex = Math.min(lastRowStart + column, displayItems.length - 1);
      setSelectedIndex(targetIndex);
    }
  };

  const downHandler = () => {
    if (displayItems.length === 0) return;
    const itemsPerRow = 8;
    const newIndex = selectedIndex + itemsPerRow;
    if (newIndex < displayItems.length) {
      setSelectedIndex(newIndex);
    } else {
      // Move to first row, same column
      const column = selectedIndex % itemsPerRow;
      const targetIndex = Math.min(column, displayItems.length - 1);
      setSelectedIndex(targetIndex);
    }
  };

  const leftHandler = () => {
    if (displayItems.length === 0) return;
    const newIndex = (selectedIndex + displayItems.length - 1) % displayItems.length;
    setSelectedIndex(newIndex);
  };

  const rightHandler = () => {
    if (displayItems.length === 0) return;
    const newIndex = (selectedIndex + 1) % displayItems.length;
    setSelectedIndex(newIndex);
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

      if (event.key === "ArrowLeft") {
        leftHandler();
        return true;
      }

      if (event.key === "ArrowRight") {
        rightHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (!displayItems.length) {
    return (
      <div className="emoji-picker rounded-lg border border-border bg-popover shadow-lg">
        <div className="p-4 text-sm text-muted-foreground text-center">No emojis found</div>
      </div>
    );
  }

  return (
    <div className="emoji-picker rounded-lg border border-border bg-popover shadow-lg max-w-[420px]">
      {/* Emoji grid - scrollable with all categories */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="overflow-auto max-h-[280px] p-3">
        {hasSearchQuery ? (
          // Search results - flat grid
          <div className="grid grid-cols-8 gap-1">
            {displayItems.map((item, index) => (
              <button
                key={`${item.shortcodes?.[0]}-${index}`}
                type="button"
                title={item.name}
                className={`emoji-item flex items-center justify-center w-11 h-11 rounded-md transition-all ${
                  index === selectedIndex ? "bg-accent ring-2 ring-ring scale-105" : "hover:bg-accent/50 hover:scale-105"
                }`}
                onClick={() => selectItem(index)}
              >
                <span className="text-2xl leading-none">{item.emoji}</span>
              </button>
            ))}
          </div>
        ) : (
          // Category sections - continuous scroll
          <div className="space-y-4">
            {allCategorySections.map(({ category, emojis }) => (
              <div
                key={category}
                ref={(el) => {
                  if (el) {
                    categoryRefs.current.set(category, el);
                  } else {
                    categoryRefs.current.delete(category);
                  }
                }}
              >
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">{category}</div>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((item, index) => {
                    // Calculate global index
                    const globalIndex =
                      allCategorySections
                        .slice(
                          0,
                          allCategorySections.findIndex((s) => s.category === category),
                        )
                        .reduce((acc, section) => acc + section.emojis.length, 0) + index;

                    return (
                      <button
                        key={`${item.shortcodes?.[0]}-${globalIndex}`}
                        type="button"
                        title={item.name}
                        className={`emoji-item flex items-center justify-center w-11 h-11 rounded-md transition-all ${
                          globalIndex === selectedIndex ? "bg-accent ring-2 ring-ring scale-105" : "hover:bg-accent/50 hover:scale-105"
                        }`}
                        onClick={() => selectItem(globalIndex)}
                      >
                        <span className="text-2xl leading-none">{item.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category tabs - only show when no search query */}
      {!hasSearchQuery && (
        <div className="border-b border-border p-2 bg-muted/50">
          <div className="flex flex-wrap gap-1">
            {categories.map(({ category }) => (
              <button
                key={category}
                type="button"
                onClick={() => scrollToCategory(category)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer with selected emoji info */}
      {/* {selectedIndex >= 0 && selectedIndex < displayItems.length && (
        <div className="border-t border-border px-3 py-2.5 bg-muted/50">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{displayItems[selectedIndex].emoji}</span>
            <div className="flex flex-col">
              <span className="text-sm font-medium capitalize leading-tight text-foreground">
                {displayItems[selectedIndex].name}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                :{displayItems[selectedIndex].shortcodes?.[0] || displayItems[selectedIndex].name}:
              </span>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
});

EmojiList.displayName = "EmojiList";
