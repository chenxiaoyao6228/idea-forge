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
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const disableInput = () => {
    setIsEditing(false);
    // If the value changed while editing, save it
    // Handle empty titles by saving empty string (persistence layer decides fallback)
    if (value !== doc?.title) {
      handleTitleUpdate(value.trim());
    }
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
