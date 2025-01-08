import "./index.css";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useCollaborationProvider } from "./hooks/useCollaborationProvider";
import { getRandomElement } from "@/lib/utils";
import useUserStore from "@/stores/user";
import { COLLABORATE_EDIT_USER_COLORS } from "./constant";
import { extensions } from "./extensions";
import BubbleMenus from "./bubble-menus";
interface Props {
  id: string;
}

export default function TiptapEditor({ id }: Props) {
  const { userInfo } = useUserStore();

  const user = {
    name: userInfo?.displayName || (userInfo?.email as string),
    color: getRandomElement(COLLABORATE_EDIT_USER_COLORS),
  };

  const provider = useCollaborationProvider(id, user);

  const editor = useEditor({
    editorProps: {
      attributes: {
        class: "min-h-96 prose dark:prose-invert focus:outline-none max-w-none",
      },
    },
    extensions: [
      ...extensions,
      Collaboration.configure({
        document: provider.document,
      }),
      CollaborationCursor.configure({
        provider,
        user,
      }),
    ],
  });

  if (!user || !editor) return null;

  return (
    <div className="editor-container px-4 md:col-[2] w-full mx-auto mt-2">
      <EditorContent editor={editor} className="w-full" />
      <BubbleMenus editor={editor} />
    </div>
  );
}
