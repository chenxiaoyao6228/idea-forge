import { TaskItem as TTaskItem, type TaskItemOptions as TTaskItemOptions } from "@tiptap/extension-task-item";
import type { NodeMarkdownStorage } from "../markdown";

// eslint-disable-next-line ts/no-empty-object-type
export interface TaskItemOptions extends TTaskItemOptions {}

export const TaskItem = TTaskItem.extend<TaskItemOptions>({
  name: "taskItem",
  addOptions() {
    return {
      ...this.parent?.(),
      nested: true,
    };
  },
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => ({
          "data-node-id": attributes.id,
          id: attributes.id,
        }),
      },
    };
  },
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "listItem" && node.checked !== null,
          apply: (state, node, type) => {
            state.openNode(type, { checked: node.checked as boolean });
            state.next(node.children);
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.openNode({
              type: "listItem",
              checked: node.attrs.checked,
            });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
