import { ArrowDownToLine, Check, RefreshCcw, Trash2 } from "lucide-react";
import ActionItem from "./action-item";
import { useAIPanelStore } from "./ai-panel-store";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const hasSelection = useAIPanelStore((state) => state.hasSelection);

  if (!hasSelection) return null;

  return <ActionItem icon={<Check className="h-4 w-4" />} label={t("Replace")} onClick={replaceResult} />;
}

function InsertBelowButton() {
  const { insertBelow } = useAIPanelStore();
  const { t } = useTranslation();
  return <ActionItem icon={<ArrowDownToLine className="h-4 w-4" />} label={t("insert Below")} onClick={insertBelow} />;
}

function DiscardButton() {
  const { discardResult } = useAIPanelStore();
  const { t } = useTranslation();
  return <ActionItem icon={<Trash2 className="h-4 w-4" />} label={t("Discard")} onClick={discardResult} />;
}

function TryAgainButton() {
  const { retryStream } = useAIPanelStore();
  const { t } = useTranslation();
  return <ActionItem icon={<RefreshCcw className="h-4 w-4" />} label={t("Try again")} onClick={retryStream} />;
}
