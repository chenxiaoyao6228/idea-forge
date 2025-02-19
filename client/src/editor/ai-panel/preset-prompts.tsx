import { MenuSquare, MoreHorizontal, PenLine, ListTree, FileText, Brain, Languages, HelpCircle, BugOff, MicVocal } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import ActionItem from "./action-item";
import { useAIPanelStore } from "./ai-panel-store";

export function AIPresetPrompts() {
  const hasSelection = useAIPanelStore.use.hasSelection();

  if (hasSelection) {
    return <SelectedTextActions />;
  }

  return <EmptySelectionActions />;
}

function EmptySelectionActions() {
  const submitPresetPrompt = useAIPanelStore.use.submitPresetPrompt();

  return (
    <div className="mt-2 inline-flex">
      <div className="rounded-md border bg-popover dark:bg-popover p-1 text-popover-foreground dark:text-popover-foreground">
        <ActionItem icon={<Brain className="h-4 w-4" />} label="Brainstorm ideas" onClick={() => submitPresetPrompt("brainstorm")} />
        <ActionItem icon={<PenLine className="h-4 w-4" />} label="Continue writing" onClick={() => submitPresetPrompt("continue_writing")} />
        <ActionItem icon={<ListTree className="h-4 w-4" />} label="Write outline" onClick={() => submitPresetPrompt("write_outline")} />
        <ActionItem icon={<FileText className="h-4 w-4" />} label="Write summary" onClick={() => submitPresetPrompt("write_summary")} />
      </div>
    </div>
  );
}

function SelectedTextActions() {
  const submitPresetPrompt = useAIPanelStore.use.submitPresetPrompt();
  const tones = ["Professional", "Casual", "Straightforward", "Confident", "Friendly"];
  const languages = ["English", "Chinese", "Spanish", "French", "German", "Japanese", "Korean"];

  return (
    <div className="mt-2 inline-flex">
      <div className="rounded-md border bg-popover dark:bg-popover p-1 text-popover-foreground dark:text-popover-foreground">
        <ActionItem icon={<HelpCircle className="h-4 w-4" />} label="Explain" onClick={() => submitPresetPrompt("explain")} />
        <ActionItem icon={<MenuSquare className="h-4 w-4" />} label="Make longer" onClick={() => submitPresetPrompt("make_longer")} />
        <ActionItem icon={<MoreHorizontal className="h-4 w-4" />} label="Make shorter" onClick={() => submitPresetPrompt("make_shorter")} />
        <ActionItem icon={<BugOff className="h-4 w-4" />} label="Fix syntax" onClick={() => submitPresetPrompt("fix_syntax")} />

        <HoverCard openDelay={0} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div>
              <ActionItem icon={<Languages className="h-4 w-4" />} label="Translate to" />
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-[200px] p-1 ml-1">
            {languages.map((language) => (
              <ActionItem
                key={language}
                label={language}
                onClick={() => {
                  submitPresetPrompt("translate", { language });
                }}
              />
            ))}
          </HoverCardContent>
        </HoverCard>

        <HoverCard openDelay={0} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div>
              <ActionItem icon={<MicVocal className="h-4 w-4" />} label="Change tone" onClick={() => submitPresetPrompt("change_tone")} />
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-[200px] p-1 ml-1">
            {tones.map((tone) => (
              <ActionItem
                key={tone}
                label={tone}
                onClick={() => {
                  submitPresetPrompt("change_tone", { tone });
                }}
              />
            ))}
          </HoverCardContent>
        </HoverCard>
      </div>
    </div>
  );
}
