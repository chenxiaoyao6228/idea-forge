import { TaskItem as TTaskItem, type TaskItemOptions as TTaskItemOptions } from "@tiptap/extension-task-item";
import type { NodeMarkdownStorage } from "../markdown";

// eslint-disable-next-line ts/no-empty-object-type
export interface TaskItemOptions extends TTaskItemOptions {}

export const TaskItem = TTaskItem.extend<TaskItemOptions>({
  name: "taskItem",
  addOptions() {
    return {
      HTMLAttributes: {},
      nested: true,
      taskListTypeName: "taskList",
    };
  },
  addAttributes() {
    return {
      // Preserve parent's attributes (including checked)
      ...this.parent?.(),
      // Add custom id attribute
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
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // When pressing Enter in a task item, only split at the current paragraph
        // Don't move subsequent blocks (like images) to the new task item
        const { state, view } = this.editor;
        const { $from } = state.selection;

        // Check if we're in a task item
        if ($from.parent.type.name !== "paragraph") {
          return false;
        }

        // Find the parent task item
        let taskItemDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === this.name) {
            taskItemDepth = d;
            break;
          }
        }

        if (taskItemDepth === -1) {
          return false;
        }

        // If cursor is at the end of the paragraph and there are more blocks after it,
        // insert a new task item after the current one instead of splitting
        const taskItemNode = $from.node(taskItemDepth);
        const paragraphIndex = $from.index(taskItemDepth);
        const hasMoreBlocks = paragraphIndex < taskItemNode.childCount - 1;

        if (hasMoreBlocks && $from.parentOffset === $from.parent.content.size) {
          // Insert new task item after current one
          const taskItemPos = $from.before(taskItemDepth);
          const taskItemSize = taskItemNode.nodeSize;
          const newTaskItem = this.editor.schema.nodes.taskItem.create({ checked: false }, this.editor.schema.nodes.paragraph.create());

          const tr = state.tr.insert(taskItemPos + taskItemSize, newTaskItem);
          const newPos = taskItemPos + taskItemSize + 1;
          tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newPos)) as any);
          view.dispatch(tr);
          return true;
        }

        // Let default behavior handle other cases
        return false;
      },
    };
  },
  addStorage() {
    return {
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
