import React, { ElementRef, useRef, useState, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { DOCUMENT_TITLE_ID } from "../../editor/constant";
import { useTranslation } from "react-i18next";
import { useCurrentDocumentFromStore } from "@/stores/document-store";
import { documentApi } from "@/apis/document";
import { getWebsocketService, SocketEvents } from "@/lib/websocket";

interface TitleInputProps {
  editable: boolean;
}

export function TitleInput({ editable }: TitleInputProps) {
  const doc = useCurrentDocumentFromStore();
  const { t } = useTranslation();
  const inputRef = useRef<ElementRef<"textarea">>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(doc?.title || "");

  // Update local value when document changes (from WebSocket or other sources)
  useEffect(() => {
    if (!isEditing) {
      const newTitle = doc?.title || "";
      setValue(newTitle);
      console.log("[TitleInput] Document title updated from store:", { newTitle, docId: doc?.id });
    }
  }, [doc?.title, isEditing]);

  // Auto-select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [isEditing]);

  useEffect(() => {
    const socket = getWebsocketService().socket;
    const handleDocumentUpdate = (event: any) => {
      setValue(event.document.title);
    };
    if (!socket) return;
    socket.on(SocketEvents.DOCUMENT_UPDATE, handleDocumentUpdate);
    return () => {
      socket.off(SocketEvents.DOCUMENT_UPDATE, handleDocumentUpdate);
    };
  }, []);

  const handleTitleUpdate = async (newTitle: string) => {
    if (!doc?.id || !editable) return;

    // Update local state immediately for optimistic UI
    setValue(newTitle);

    await documentApi.update(doc.id, { title: newTitle });
  };

  const enableInput = () => {
    if (!editable) return;

    setIsEditing(true);
    // Use requestAnimationFrame to ensure the input is fully rendered before selecting
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    });
  };

  const disableInput = async () => {
    // If the value changed while editing, save it first
    if (value !== doc?.title) {
      const trimmedValue = value.trim();
      // If empty after trim, use "Untitled" as fallback
      const titleToSave = trimmedValue || t("Untitled");
      await handleTitleUpdate(titleToSave);
    }
    // Only change editing state after the update completes
    setIsEditing(false);
  };

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
        onChange={(e) => setValue(e.target.value)}
        className={`text-4xl font-bold break-words outline-none text-[#2D2D2D] dark:text-[#CFCFCF] bg-transparent resize-none`}
        id={DOCUMENT_TITLE_ID}
        placeholder={t("Type a title...")}
      />
    );
  }

  return (
    <div onClick={enableInput} className={`text-4xl font-bold break-words outline-none text-[#2D2D2D] dark:text-[#CFCFCF] pb-[11.5px]`} id={DOCUMENT_TITLE_ID}>
      {value || t("Untitled")}
    </div>
  );
}
