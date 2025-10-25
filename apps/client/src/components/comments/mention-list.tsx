import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { MentionUserSummary, MentionType } from "@idea/contracts";
import { Avatar, AvatarFallback, AvatarImage } from "@idea/ui/shadcn/ui/avatar";
import { v4 as uuidv4 } from "uuid";
import { useCurrentUser } from "@/stores/user-store";

export interface MentionListProps {
  items: MentionUserSummary[];
  command: (item: { id: string; type: MentionType; modelId: string; label: string; actorId?: string }) => void;
  loading?: boolean;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

/**
 * Mention autocomplete list component
 *
 * Displays user suggestions when typing "@" in comments
 * Supports keyboard navigation (up/down arrows, enter, escape)
 */
export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentUser = useCurrentUser();

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command({
        id: uuidv4(), // Generate unique ID for this mention instance
        type: MentionType.USER,
        modelId: item.id, // User ID
        label: item.displayName || item.email,
        actorId: currentUser?.id, // Current user who is creating the mention
      });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.loading) {
    return (
      <div className="mention-suggestion">
        <div className="mention-suggestion-loading">Loading...</div>
      </div>
    );
  }

  if (props.items.length === 0) {
    return (
      <div className="mention-suggestion">
        <div className="mention-suggestion-empty">No users found</div>
      </div>
    );
  }

  return (
    <div className="mention-suggestion">
      <div className="mention-suggestion-list">
        {props.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`mention-suggestion-item ${index === selectedIndex ? "is-selected" : ""}`}
            onClick={() => selectItem(index)}
          >
            <Avatar className="mention-suggestion-item-avatar">
              <AvatarImage src={item.imageUrl || undefined} alt={item.displayName || item.email} />
              <AvatarFallback>{(item.displayName || item.email)[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="mention-suggestion-item-content">
              <div className="mention-suggestion-item-name">{item.displayName || item.email}</div>
              {item.displayName && <div className="mention-suggestion-item-email">{item.email}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

MentionList.displayName = "MentionList";
