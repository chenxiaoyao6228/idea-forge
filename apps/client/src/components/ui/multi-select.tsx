"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: MultiSelectOption[];
  onSelectionChange: (selected: MultiSelectOption[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  renderOption?: (option: MultiSelectOption) => React.ReactNode;
  renderBadge?: (option: MultiSelectOption, onRemove: () => void) => React.ReactNode;
  filterOptions?: (options: MultiSelectOption[], searchValue: string) => MultiSelectOption[];
  onSearchChange?: (searchValue: string) => void;
  searchValue?: string;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  renderOption,
  renderBadge,
  filterOptions,
  onSearchChange,
  searchValue,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(searchValue || "");

  const handleUnselect = React.useCallback(
    (option: MultiSelectOption) => {
      onSelectionChange(selected.filter((s) => s.value !== option.value));
    },
    [selected, onSelectionChange],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            onSelectionChange(selected.slice(0, -1));
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [selected, onSelectionChange],
  );

  const handleSelect = React.useCallback(
    (option: MultiSelectOption) => {
      // Don't select separator items
      if (option.type === "separator") {
        return;
      }
      setInputValue("");
      onSearchChange?.("");
      onSelectionChange([...selected, option]);
    },
    [selected, onSelectionChange, onSearchChange],
  );

  // Handle input value changes
  const handleInputChange = React.useCallback(
    (value: string) => {
      setInputValue(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  // Sync with external searchValue prop
  React.useEffect(() => {
    if (searchValue !== undefined && searchValue !== inputValue) {
      setInputValue(searchValue);
    }
  }, [searchValue, inputValue]);

  // Filter out already selected options
  const availableOptions = options.filter((option) => !selected.some((s) => s.value === option.value));

  // Apply custom filter or default filter
  const filteredOptions = filterOptions
    ? filterOptions(availableOptions, inputValue)
    : availableOptions.filter((option) => option.label.toLowerCase().includes(inputValue.toLowerCase()));

  const defaultRenderOption = (option: MultiSelectOption) => <span>{option.label}</span>;

  const defaultRenderBadge = (option: MultiSelectOption, onRemove: () => void) => (
    <Badge key={option.value} variant="secondary">
      {option.label}
      <button
        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onRemove();
          }
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={onRemove}
      >
        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </Badge>
  );

  return (
    <Command onKeyDown={handleKeyDown} className={cn("overflow-visible bg-transparent", className)}>
      <div
        className={cn(
          "group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => {
            return renderBadge ? renderBadge(option, () => handleUnselect(option)) : defaultRenderBadge(option, () => handleUnselect(option));
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={handleInputChange}
            onBlur={() => setOpen(false)}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : searchPlaceholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="relative mt-2">
        <CommandList>
          {open && filteredOptions.length > 0 ? (
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto max-h-60">
                {filteredOptions.map((option) => {
                  const isSeparator = option.type === "separator";

                  if (isSeparator) {
                    return renderOption ? renderOption(option) : defaultRenderOption(option);
                  }

                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => handleSelect(option)}
                      className={isSeparator ? "cursor-default hover:bg-transparent bg-red-500" : "cursor-pointer"}
                    >
                      {renderOption ? renderOption(option) : defaultRenderOption(option)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ) : null}
        </CommandList>
      </div>
    </Command>
  );
}
