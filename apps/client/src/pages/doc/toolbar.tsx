import React, { ElementRef, useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { ImageIcon, Smile, X } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { IconPicker } from "./icon-picker";
import { Emoji } from "emoji-picker-react";
import { DOCUMENT_TITLE_ID } from "../../editor/constant";
import { debounce } from "lodash-es";
import { useTranslation } from "react-i18next";
import useDocumentStore, { DocumentEntity } from "@/stores/document-store";
import { PRESET_CATEGORIES } from "./constants";
import { documentApi } from "@/apis/document";
import { TitleInput } from "./title-input";

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

    await documentApi.updateCover(doc.id, {
      url: randomCover.url,
      scrollY: 50,
      isPreset: true,
    });
  }, [doc.id]);

  const onIconSelect = (icon: string) => {
    documentApi.update(doc.id, { icon });
  };

  const onRemoveIcon = async () => {
    await documentApi.update(doc.id, { icon: "" });
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

      <TitleInput editable={editable} />
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
