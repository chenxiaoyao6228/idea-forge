# Bubble Menus

Contextual menus that appear when interacting with editor content.

## Core Components

- **CustomBubbleMenu** - Base component with positioning and blur handling
- **BubbleMenuWrapper** - Consistent styling wrapper

## ⚠️ Critical: Preventing Menu Flicker

### The Problem

Clicking buttons causes flicker (requires 2 clicks) because:
1. Click triggers `mousedown` → editor loses focus
2. Blur handler hides menu
3. Click event never fires

### The Solution

**Always add `onMouseDown={(e) => e.preventDefault()}` to ALL interactive elements.**

```tsx
// Simple button
<Button
  onClick={handleClick}
  onMouseDown={(e) => e.preventDefault()}  // ✅ Required
>
  Action
</Button>

// Popover
<Popover>
  <PopoverTrigger asChild>
    <Button onMouseDown={(e) => e.preventDefault()}>  {/* ✅ On trigger */}
      Open
    </Button>
  </PopoverTrigger>
  <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>  {/* ✅ On content */}
    <Button
      onClick={handleAction}
      onMouseDown={(e) => e.preventDefault()}  {/* ✅ On each option */}
    >
      Option
    </Button>
  </PopoverContent>
</Popover>
```

## Quick Checklist

When adding interactive elements to bubble menus:

- [ ] Add `onMouseDown={(e) => e.preventDefault()}` to all buttons
- [ ] Add `onMouseDown={(e) => e.preventDefault()}` to PopoverTrigger buttons
- [ ] Add `onOpenAutoFocus={(e) => e.preventDefault()}` to PopoverContent
- [ ] Add `onMouseDown={(e) => e.preventDefault()}` to ALL buttons inside popovers
- [ ] Test: Single click should work immediately (not require double-click)

## Example

```tsx
export default function MyMenu({ editor, containerRef }) {
  return (
    <CustomBubbleMenu
      editor={editor}
      shouldShow={({ editor }) => editor.isActive("myNode")}
      updateDelay={0}
    >
      <BubbleMenuWrapper>
        <Button
          onClick={() => editor.chain().focus().run()}
          onMouseDown={(e) => e.preventDefault()}
        >
          Action
        </Button>
      </BubbleMenuWrapper>
    </CustomBubbleMenu>
  );
}
```

## Reference

See existing menus for examples:
- `text-menu/` - Simple buttons
- `code-block-menu/` - Popovers with dropdowns
