import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useContentType } from "./useContentType";

interface IProps {
  editor: Editor | null;
}

export default function ContentTypeMenu(props: IProps) {
  const { editor } = props;
  const options = useContentType(editor);

  if (editor == null) return;

  function getLabel() {
    const item = options.find((op) => op.isActive());
    return item?.label ?? "Text";
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" tabIndex={-1} className="text-sm font-medium text-muted-foreground hover:bg-secondary/80">
          {getLabel()}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-lg p-1 shadow-lg" align="start">
        {options.map((op) => (
          <Button
            key={op.id}
            disabled={op.disabled()}
            variant="ghost"
            size="lg"
            onClick={op.onClick}
            className={`
              flex w-full items-start gap-2 rounded-md px-3 py-1.5 text-left 
              ${op.isActive() ? "bg-secondary/80" : "hover:bg-secondary/80"} 
              ${op.disabled() ? "opacity-50" : ""}
            `}
            tabIndex={-1}
          >
            <div className="mt-0.5 text-muted-foreground">
              <op.Icon />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-none">{op.label}</p>
              {op.description && <p className="mt-1 text-xs text-muted-foreground">{op.description}</p>}
            </div>
            {op.isActive() && <div className="ml-2 text-sm text-primary">✓</div>}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
