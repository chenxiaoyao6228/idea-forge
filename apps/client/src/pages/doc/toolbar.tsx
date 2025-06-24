import React, { ElementRef, useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Smile, X } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { IconPicker } from "./icon-picker";
import { Emoji } from "emoji-picker-react";
import { DOCUMENT_TITLE_ID } from "../../editor/constant";
import { debounce } from "lodash-es";
import { useTranslation } from "react-i18next";
import useDocumentStore, { DocumentEntity } from "@/stores/document";
import { PRESET_CATEGORIES } from "./constants";
import { documentApi } from "@/apis/document";

interface ToolbarProps {
  doc: DocumentEntity;
  editable: boolean;
}

export const Toolbar = ({ doc, editable }: ToolbarProps) => {
  const { t } = useTranslation();

  const generateDefaultCover = useCallback(async () => {
    if (!doc.id) return;
    const allPresetCovers = PRESET_CATEGORIES.flatMap((category) => category.items);
    const randomCover = allPresetCovers[Math.floor(Math.random() * allPresetCovers.length)];

    if (!randomCover) throw new Error("No preset covers available");

    const response = await documentApi.updateCover(doc.id, {
      url: randomCover.url,
      scrollY: 50,
      isPreset: true,
    });
  }, [doc.id]);

  const onIconSelect = (icon: string) => {
    // TODO: update through websocket
    documentApi.update(doc.id, { icon });
  };

  const onRemoveIcon = async () => {
    await documentApi.update(doc.id, { icon: "" });
  };

  const onUpdateTitle = async (title: string) => {
    await documentApi.update(doc.id, { title });
  };

  return (
    <div className="group relative mx-10">
      <IconSelector doc={doc} editable={editable} onIconSelect={onIconSelect} onRemoveIcon={onRemoveIcon} />

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-x-1 py-2">
        {!doc.icon && editable && (
          <IconPicker asChild onChange={onIconSelect}>
            <Button className="text-muted-foreground text-xs" variant="outline" size="sm">
              <Smile className="h-4 w-4 mr-2" /> {t("Add icon")}
            </Button>
          </IconPicker>
        )}

        {doc?.id && !doc?.coverImage && (
          <Button onClick={() => generateDefaultCover()} className="text-muted-foreground text-xs" variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" /> {t("Add cover")}
          </Button>
        )}
      </div>

      <TitleInput doc={doc} editable={editable} onUpdateTitle={onUpdateTitle} />
    </div>
  );
};

// Icon Selector

interface IconSelectorProps {
  doc: DocumentEntity;
  editable: boolean;
  onIconSelect: (icon: string) => void;
  onRemoveIcon: () => void;
}

const IconSelector = ({ doc, editable, onIconSelect, onRemoveIcon }: IconSelectorProps) => {
  const { t } = useTranslation();
  if (!doc.icon) return null;

  const coverImage = doc.coverImage;

  const emoji = doc.icon as string;

  if (!editable) {
    return (
      <div className={`${coverImage ? "-mt-6" : "mt-6"}`}>
        <Emoji unified={emoji} size={64} />
      </div>
    );
  }

  return (
    <div className={`${coverImage ? "-mt-6" : "mt-6"} inline-flex items-center gap-x-2 group/icon `}>
      <IconPicker onChange={onIconSelect}>
        <Emoji unified={emoji} size={64} />
      </IconPicker>
      <Button
        onClick={onRemoveIcon}
        variant="outline"
        size="icon"
        className="rounded-full opacity-0 group-hover/icon:opacity-100 transition text-muted-foreground text-xs"
        aria-label={t("Remove icon")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Title Input

interface TitleInputProps {
  doc: DocumentEntity;
  editable: boolean;
  onUpdateTitle: (title: string) => void;
}

function TitleInput({ doc, editable, onUpdateTitle }: TitleInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<ElementRef<"textarea">>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(doc?.title || t("Untitled"));

  const debouncedUpdate = useMemo(
    () =>
      debounce((id: string, title: string) => {
        onUpdateTitle(title);
      }, 500),
    [onUpdateTitle],
  );

  const onInput = (value: string) => {
    setValue(value);
    debouncedUpdate(doc.id, value);
  };

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const enableInput = () => {
    if (!editable) return;

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

  if (isEditing && editable) {
    return (
      <TextareaAutosize
        ref={inputRef}
        onBlur={disableInput}
        onKeyDown={onKeyDown}
        value={value}
        onChange={(e) => onInput(e.target.value)}
        className={`text-4xl font-bold break-words outline-none text-[#2D2D2D] dark:text-[#CFCFCF] bg-transparent resize-none`}
        id={DOCUMENT_TITLE_ID}
        placeholder={t("Type a title...")}
      />
    );
  }

  return (
    <div onClick={enableInput} className={`text-4xl font-bold break-words outline-none text-[#2D2D2D] dark:text-[#CFCFCF] pb-[11.5px]`} id={DOCUMENT_TITLE_ID}>
      {doc.title || t("Untitled")}
    </div>
  );
}
