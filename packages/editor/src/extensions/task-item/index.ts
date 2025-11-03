import { TaskItem as TTaskItem, type TaskItemOptions as TTaskItemOptions } from "@tiptap/extension-task-item";
import type { NodeMarkdownStorage } from "../markdown/types";
import { TextSelection } from "@tiptap/pm/state";

// eslint-disable-next-line ts/no-empty-object-type
export interface TaskItemOptions extends TTaskItemOptions {}

export const TaskItem = TTaskItem.extend<TaskItemOptions>({
  name: "taskItem",
  draggable: true,
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
        // When pressing Enter in a task item, handle splitting properly
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;

        // Check if we're in a paragraph within a task item
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

        const taskItemNode = $from.node(taskItemDepth);
        const paragraphIndex = $from.index(taskItemDepth);
        const hasMoreBlocks = paragraphIndex < taskItemNode.childCount - 1;

        // Case 1: At the end of paragraph with more blocks after it
        // Create new task item AFTER current one (keeps images/blocks in current item)
        if (hasMoreBlocks && $from.parentOffset === $from.parent.content.size) {
          const taskItemPos = $from.before(taskItemDepth);
          const taskItemSize = taskItemNode.nodeSize;
          const newTaskItem = this.editor.schema.nodes.taskItem.create({ checked: false }, this.editor.schema.nodes.paragraph.create());

          const tr = state.tr.insert(taskItemPos + taskItemSize, newTaskItem);
          const newPos = taskItemPos + taskItemSize + 1;
          tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
          view.dispatch(tr);
          return true;
        }

        // Case 2: Empty paragraph at the end - exit task list
        if (empty && $from.parent.content.size === 0 && !hasMoreBlocks) {
          return this.editor.commands.liftListItem(this.name);
        }

        // Case 3: Normal split - use default splitListItem behavior
        if (empty || !hasMoreBlocks) {
          return this.editor.commands.splitListItem(this.name);
        }

        // Let default behavior handle other cases
        return false;
      },

      // TODO: allow drag handler to drag to re-order
      // Move task item up (increase priority)
      "Mod-Shift-ArrowUp": () => {
        const { state, view } = this.editor;
        const { $from } = state.selection;

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

        const taskListDepth = taskItemDepth - 1;
        const taskList = $from.node(taskListDepth);
        const taskItemIndex = $from.index(taskListDepth);

        // Can't move up if already first
        if (taskItemIndex === 0) {
          return false;
        }

        const taskItemPos = $from.before(taskItemDepth);
        const taskItemNode = $from.node(taskItemDepth);
        const prevTaskItem = taskList.child(taskItemIndex - 1);

        // Delete current task item and insert before previous one
        const tr = state.tr.delete(taskItemPos, taskItemPos + taskItemNode.nodeSize);
        const insertPos = taskItemPos - prevTaskItem.nodeSize;
        tr.insert(insertPos, taskItemNode);

        // Calculate new cursor position (inside the moved task item)
        const newPos = insertPos + ($from.pos - taskItemPos);
        tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));

        view.dispatch(tr);
        return true;
      },

      // Move task item down (decrease priority)
      "Mod-Shift-ArrowDown": () => {
        const { state, view } = this.editor;
        const { $from } = state.selection;

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

        const taskListDepth = taskItemDepth - 1;
        const taskList = $from.node(taskListDepth);
        const taskItemIndex = $from.index(taskListDepth);

        // Can't move down if already last
        if (taskItemIndex === taskList.childCount - 1) {
          return false;
        }

        const taskItemPos = $from.before(taskItemDepth);
        const taskItemNode = $from.node(taskItemDepth);
        const nextTaskItem = taskList.child(taskItemIndex + 1);

        // Delete current task item and insert after next one
        const tr = state.tr.delete(taskItemPos, taskItemPos + taskItemNode.nodeSize);
        const insertPos = taskItemPos + nextTaskItem.nodeSize;
        tr.insert(insertPos, taskItemNode);

        // Calculate new cursor position (inside the moved task item)
        const newPos = insertPos + ($from.pos - taskItemPos);
        tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));

        view.dispatch(tr);
        return true;
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
