import * as React from "react";
import { Input } from "@idea/ui/shadcn/ui/input";
import { cn } from "@idea/ui/shadcn/utils";

interface EditableTitleProps {
  title: string;
  onSubmit: (value: string) => Promise<void> | void;
  isEditing?: boolean;
  onEditing?: (editing: boolean) => void;
  editable?: boolean;
  maxLength?: number;
  placeholder?: string;
  onCancel?: () => void;
}

export const EditableTitle = React.forwardRef<{ setIsEditing: (editing: boolean) => void }, EditableTitleProps>(
  ({ title, onSubmit, isEditing, onEditing, editable, maxLength, placeholder, onCancel }, ref) => {
    const [value, setValue] = React.useState(title);
    const [isEditingInternal, setIsEditingInternal] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const editing = isEditing ?? isEditingInternal;

    React.useImperativeHandle(ref, () => ({
      setIsEditing: (editing: boolean) => {
        setIsEditingInternal(editing);
        onEditing?.(editing);
      },
    }));

    React.useEffect(() => {
      if (editing && inputRef.current) {
        // Use requestAnimationFrame to ensure the input is fully rendered before selecting
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        });
      }
    }, [editing]);

    // Sync local state with prop changes from WebSocket events
    React.useEffect(() => {
      if (!editing) {
        setValue(title);
      }
    }, [title, editing]);

    const handleCancel = () => {
      setValue(title);
      setIsEditingInternal(false);
      onEditing?.(false);
      onCancel?.();
    };

    const handleSubmit = async () => {
      // Get the actual current value from the input DOM element
      // This ensures we capture all keystrokes even if React state batching hasn't caught up
      const currentValue = inputRef.current?.value ?? value;
      const trimmedValue = currentValue.trim();

      // If empty, cancel the edit and revert to original title
      if (!trimmedValue) {
        handleCancel();
        return;
      }

      // Only save if value changed
      if (trimmedValue !== title) {
        await onSubmit(trimmedValue);
      }

      setIsEditingInternal(false);
      onEditing?.(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    if (editing && editable) {
      return (
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          className="h-auto p-0 border-none bg-transparent text-sm"
        />
      );
    }

    return <span className="truncate">{title || placeholder}</span>;
  },
);
