import "./index.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useCollaborationProvider } from "./hooks/useCollaborationProvider";
import { getRandomElement } from "@/lib/utils";
import useUserStore from "@/stores/user";
import { COLLABORATE_EDIT_USER_COLORS } from "./constant";

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
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: provider.document,
      }),
      CollaborationCursor.configure({
        provider,
        user,
      }),
    ],
  });

  if (!user) return null;

  return (
    <div className="editor-container px-4 md:col-[2] w-full mx-auto mt-2 border border-blue-500">
      <EditorContent editor={editor} className="w-full" />
    </div>
  );
}
