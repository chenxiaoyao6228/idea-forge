import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";

export interface IButtonProps {
  editor: Editor | null;
  currentNode: Node | null;
  currentNodePos: number;
}
