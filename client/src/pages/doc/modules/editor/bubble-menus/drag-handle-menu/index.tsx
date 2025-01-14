import DragHandle from "@tiptap-pro/extension-drag-handle-react";
import type { MenuProps } from "../type";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DragHandleMenu(props: MenuProps) {
  const { editor } = props;

  return (
    <DragHandle editor={editor} pluginKey="DragHandleMenu">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="cursor-grab">
          <GripVertical className="h-5 w-5" />
        </Button>
      </div>
    </DragHandle>
  );
}
