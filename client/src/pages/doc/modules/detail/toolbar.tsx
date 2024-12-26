import React, { ElementRef, useRef, useState } from "react";
import { DocTreeDataNode, useDocumentStore } from "../../store";
import { Button } from "@/components/ui/button";
import { ImageIcon, Smile, X } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { IconPicker } from "./icon-picker";
import { Emoji } from "emoji-picker-react";

interface ToolbarProps {
  doc: DocTreeDataNode;
  preview?: boolean;
}

interface IconSectionProps {
  doc: DocTreeDataNode;
  preview?: boolean;
  onIconSelect: (icon: string) => void;
  onRemoveIcon: () => void;
}

const useDocumentTitle = (doc: DocTreeDataNode) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(doc?.title || "");
  const updateDocument = useDocumentStore.use.updateDocument();

  const onInput = (value: string) => {
    setValue(value);
    updateDocument(doc.id, {
      title: value || "Untitled",
    });
  };

  return {
    isEditing,
    setIsEditing,
    value,
    setValue,
    onInput,
  };
};

const IconSection = ({ doc, preview, onIconSelect, onRemoveIcon }: IconSectionProps) => {
  if (!doc.icon) return null;

  const emoji = doc.icon as string;

  if (preview) {
    return <Emoji unified={emoji} size={64} />;
  }

  return (
    <div className="flex items-center gap-x-2 group/icon pt-6">
      <IconPicker onChange={onIconSelect}>
        <Emoji unified={emoji} size={64} />
      </IconPicker>
      <Button
        onClick={onRemoveIcon}
        variant="outline"
        size="icon"
        className="rounded-full opacity-0 group-hover/icon:opacity-100 transition text-muted-foreground text-xs"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const STYLES = {
  title: "text-5xl font-bold break-words outline-none text-[#2D2D2D] dark:text-[#CFCFCF]",
} as const;

export const Toolbar = ({ doc, preview }: ToolbarProps) => {
  const inputRef = useRef<ElementRef<"textarea">>(null);
  const { isEditing, setIsEditing, value, setValue, onInput } = useDocumentTitle(doc);
  const updateDocument = useDocumentStore.use.updateDocument();

  const enableInput = () => {
    if (preview) return;

    setIsEditing(true);
    setTimeout(() => {
      setValue(doc.title);
      inputRef.current?.focus();
    }, 0);
  };

  const disableInput = () => setIsEditing(false);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      disableInput();
    }
  };

  const onIconSelect = (icon: string) => {
    updateDocument(doc.id, { icon });
  };

  const onRemoveIcon = () => {
    updateDocument(doc.id, { icon: undefined });
  };

  return (
    <div className="pl-[54px] group relative">
      <IconSection doc={doc} preview={preview} onIconSelect={onIconSelect} onRemoveIcon={onRemoveIcon} />

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-x-1 py-4">
        {!doc.icon && !preview && (
          <IconPicker asChild onChange={onIconSelect}>
            <Button className="text-muted-foreground text-xs" variant="outline" size="sm">
              <Smile className="h-4 w-4 mr-2" /> Add icon
            </Button>
          </IconPicker>
        )}

        {doc.id && (
          <Button onClick={() => {}} className="text-muted-foreground text-xs" variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" /> Add cover
          </Button>
        )}
      </div>

      {isEditing && !preview ? (
        <TextareaAutosize
          ref={inputRef}
          onBlur={disableInput}
          onKeyDown={onKeyDown}
          value={value}
          onChange={(e) => onInput(e.target.value)}
          className={`${STYLES.title} bg-transparent resize-none`}
        />
      ) : (
        <div onClick={enableInput} className={`${STYLES.title} pb-[11.5px]`}>
          {doc.title}
        </div>
      )}
    </div>
  );
};
