import { ArrowDownToLine, Check, RefreshCcw, Trash2 } from "lucide-react";
import ActionItem from "./action-item";
import { useAIPanelStore } from "./ai-panel-store";

export default function ConfirmButtons() {
  return (
    <div className="mt-2 inline-flex">
      <div className="rounded-md border bg-popover p-1 text-popover-foreground">
        <AcceptButton />
        <DiscardButton />
        <TryAgainButton />
        <InsertBelowButton />
      </div>
    </div>
  );
}

function AcceptButton() {
  const { confirmResult } = useAIPanelStore();
  return <ActionItem icon={<Check className="h-4 w-4" />} label="Accept" onClick={confirmResult} />;
}

function DiscardButton() {
  const { cancelResult } = useAIPanelStore();
  return <ActionItem icon={<Trash2 className="h-4 w-4" />} label="Discard" onClick={cancelResult} />;
}

function TryAgainButton() {
  const { retryStream } = useAIPanelStore();
  return <ActionItem icon={<RefreshCcw className="h-4 w-4" />} label="Try again" onClick={retryStream} />;
}

function InsertBelowButton() {
  const { insertBelow } = useAIPanelStore();
  return <ActionItem icon={<ArrowDownToLine className="h-4 w-4" />} label="insert Below" onClick={insertBelow} />;
}
