import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import { Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, ListTodo } from "lucide-react";
import { useTranslation } from "react-i18next";

export const useContentType = (editor: Editor | null) => {
  const { t } = useTranslation();
  const options = useMemo(() => {
    if (editor == null) return [];
    return [
      {
        id: "paragraph",
        Icon: () => <Pilcrow className="h-4 w-4" />,
        label: t("Text"),
        description: t("Just start writing with plain text."),
        disabled: () => !editor.can().setParagraph(),
        isActive: () => editor.isActive("paragraph") && !editor.isActive("orderedList") && !editor.isActive("bulletList") && !editor.isActive("taskList"),
        onClick: () => editor.chain().focus().lift("taskItem").liftListItem("listItem").setParagraph().run(),
      },
      {
        id: "heading1",
        Icon: () => <Heading1 className="h-4 w-4" />,
        label: t("Heading 1"),
        description: t("Big section heading."),
        disabled: () => !editor.can().setHeading({ level: 1 }),
        isActive: () => editor.isActive("heading", { level: 1 }),
        onClick: () => editor.chain().focus().lift("taskItem").liftListItem("listItem").setHeading({ level: 1 }).run(),
      },
      {
        id: "heading2",
        Icon: () => <Heading2 className="h-4 w-4" />,
        label: t("Heading 2"),
        description: t("Medium section heading."),
        disabled: () => !editor.can().setHeading({ level: 2 }),
        isActive: () => editor.isActive("heading", { level: 2 }),
        onClick: () => editor.chain().focus().lift("taskItem").liftListItem("listItem").setHeading({ level: 2 }).run(),
      },
      {
        id: "heading3",
        Icon: () => <Heading3 className="h-4 w-4" />,
        label: t("Heading 3"),
        description: t("Small section heading."),
        disabled: () => !editor.can().setHeading({ level: 3 }),
        isActive: () => editor.isActive("heading", { level: 3 }),
        onClick: () => editor.chain().focus().lift("taskItem").liftListItem("listItem").setHeading({ level: 3 }).run(),
      },
      {
        id: "list",
        Icon: () => <List className="h-4 w-4" />,
        label: t("Bulleted list"),
        description: t("Create a simple bulleted list."),
        disabled: () => !editor.can().toggleBulletList(),
        isActive: () => editor.isActive("bulletList"),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        id: "listOrdered",
        Icon: () => <ListOrdered className="h-4 w-4" />,
        label: t("Numbered list"),
        description: t("Create a list with numbering."),
        disabled: () => !editor.can().toggleOrderedList(),
        isActive: () => editor.isActive("orderedList"),
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        id: "listTodo",
        Icon: () => <ListTodo className="h-4 w-4" />,
        label: t("To-do list"),
        description: t("Track tasks with a to-do list."),
        disabled: () => !editor.can().toggleTaskList(),
        isActive: () => editor.isActive("taskList"),
        onClick: () => editor.chain().focus().toggleTaskList().run(),
      },
    ];
  }, [editor, t]);

  return options;
};
