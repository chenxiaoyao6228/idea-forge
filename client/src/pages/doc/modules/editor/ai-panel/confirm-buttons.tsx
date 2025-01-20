import { ArrowDownToLine, Check, RefreshCcw, Trash2 } from "lucide-react";
import ActionItem from "./action-item";
import { useAIPanelStore } from "./ai-panel-store";

export default function ConfirmButtons() {
  return (
    <div id="ai-confirm-buttons" className="mt-2 inline-flex">
      <div className="rounded-md border bg-popover p-1 text-popover-foreground">
        <ReplaceButton />
        <InsertBelowButton />
        <DiscardButton />
        <TryAgainButton />
      </div>
    </div>
  );
}

function ReplaceButton() {
  const { replaceResult } = useAIPanelStore();
  const hasSelection = useAIPanelStore((state) => state.hasSelection);

  if (!hasSelection) return null;

  return <ActionItem icon={<Check className="h-4 w-4" />} label="Replace" onClick={replaceResult} />;
}

function InsertBelowButton() {
  const { insertBelow } = useAIPanelStore();
  return <ActionItem icon={<ArrowDownToLine className="h-4 w-4" />} label="insert Below" onClick={insertBelow} />;
}

function DiscardButton() {
  const { discardResult } = useAIPanelStore();
  return <ActionItem icon={<Trash2 className="h-4 w-4" />} label="Discard" onClick={discardResult} />;
}

function TryAgainButton() {
  const { retryStream } = useAIPanelStore();
  return <ActionItem icon={<RefreshCcw className="h-4 w-4" />} label="Try again" onClick={retryStream} />;
}
