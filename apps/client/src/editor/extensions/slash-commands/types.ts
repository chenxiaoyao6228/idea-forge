import type { Editor } from "@tiptap/core";
import type { Range } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";

export interface Command {
  name: string;
  label: string;
  description?: string;
  aliases?: string[];
  Icon: LucideIcon;
  command: (props: { editor: Editor; range: Range }) => void;
  shouldBeHidden?: (editor: Editor) => boolean;
}

export interface CommandGroup {
  name: string;
  title: string;
  commands: Command[];
}

export interface CommandListProps {
  items: CommandGroup[];
  command: (command: Command) => void;
  editor: Editor;
}
