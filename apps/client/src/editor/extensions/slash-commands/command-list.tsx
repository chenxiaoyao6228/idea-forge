import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from '@idea/ui/shadcn/ui/button';
import type { CommandListProps } from "./types";

export const CommandList = React.forwardRef<any, CommandListProps>((props, ref) => {
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const activeItem = useRef<HTMLButtonElement>(null);

  // Reset selection when items change
  useEffect(() => {
    setSelectedGroup(0);
    setSelectedCommand(0);
  }, [props.items]);

  // Scroll active item into view
  useEffect(() => {
    if (activeItem.current && scrollContainer.current) {
      activeItem.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedGroup, selectedCommand]);

  const selectItem = useCallback(
    (groupIndex: number, commandIndex: number) => {
      const command = props.items[groupIndex].commands[commandIndex];
      props.command(command);
    },
    [props],
  );

  const navigateNext = useCallback(
    (currentGroup: number, currentCommand: number) => {
      const group = props.items[currentGroup];
      if (currentCommand < group.commands.length - 1) {
        return { group: currentGroup, command: currentCommand + 1 };
      }
      const nextGroup = (currentGroup + 1) % props.items.length;
      return { group: nextGroup, command: 0 };
    },
    [props.items],
  );

  const navigatePrev = useCallback(
    (currentGroup: number, currentCommand: number) => {
      if (currentCommand > 0) {
        return { group: currentGroup, command: currentCommand - 1 };
      }
      const prevGroup = (currentGroup - 1 + props.items.length) % props.items.length;
      return {
        group: prevGroup,
        command: props.items[prevGroup].commands.length - 1,
      };
    },
    [props.items],
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = navigateNext(selectedGroup, selectedCommand);
        setSelectedGroup(next.group);
        setSelectedCommand(next.command);
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = navigatePrev(selectedGroup, selectedCommand);
        setSelectedGroup(prev.group);
        setSelectedCommand(prev.command);
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        selectItem(selectedGroup, selectedCommand);
        return true;
      }

      return false;
    },
  }));

  if (!props.items.length) return null;

  return (
    <div ref={scrollContainer} className="border rounded-lg shadow-lg bg-background max-h-[min(80vh,24rem)] p-2 overflow-y-auto custom-scrollbar">
      <div className="grid gap-1">
        {props.items.map((group, groupIndex) => (
          <React.Fragment key={group.name}>
            <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase px-2 py-1.5">{group.title}</div>
            {group.commands.map((command, commandIndex) => {
              const isSelected = selectedGroup === groupIndex && selectedCommand === commandIndex;
              return (
                <Button
                  key={command.name}
                  ref={isSelected ? activeItem : null}
                  variant={isSelected ? "secondary" : "ghost"}
                  className="justify-start gap-2 px-2 w-full py-2 h-11"
                  onClick={() => selectItem(groupIndex, commandIndex)}
                >
                  <command.Icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium leading-none">{command.label}</p>
                    {command.description && <p className="mt-1 text-xs text-muted-foreground">{command.description}</p>}
                  </div>
                </Button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

CommandList.displayName = "CommandList";
