import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [editing]);

    // Sync local state with prop changes from WebSocket events
    React.useEffect(() => {
      if (!editing) {
        setValue(title);
      }
    }, [title, editing]);

    const handleSubmit = async () => {
      if (value.trim() && value !== title) {
        await onSubmit(value.trim());
      }
      setIsEditingInternal(false);
      onEditing?.(false);
    };

    const handleCancel = () => {
      setValue(title);
      setIsEditingInternal(false);
      onEditing?.(false);
      onCancel?.();
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

    if (editing && canUpdate) {
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
