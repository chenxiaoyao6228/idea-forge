import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { WandSparkles } from "lucide-react";
import { useAIPanelStore } from "../../ai-panel/ai-panel-store";

interface IProps {
  editor: Editor | null;
}

export default function AIMenu(props: IProps) {
  const { editor } = props;
  const setVisible = useAIPanelStore.use.setVisible();
  const setHasSelection = useAIPanelStore.use.setHasSelection();

  if (!editor) return null;

  const handleAIClick = () => {
    const selection = editor.state.selection;
    const { from, to } = selection;

    if (from === to) return;

    // Show AI panel
    setVisible(true);
  };

  return (
    <Button size="sm" onClick={handleAIClick} variant="ghost" tabIndex={-1}>
      <WandSparkles className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
      Ask AI
    </Button>
  );
}
