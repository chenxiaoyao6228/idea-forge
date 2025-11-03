import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, any>;
  documentId: string;
  onCommentClick?: (commentId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      /**
       * Set a comment mark
       */
      setCommentMark: (attributes: { id: string; userId: string; draft?: boolean; resolved?: boolean }) => ReturnType;
      /**
       * Toggle a comment mark
       */
      toggleCommentMark: (attributes: { id: string; userId: string; draft?: boolean; resolved?: boolean }) => ReturnType;
      /**
       * Unset a comment mark
       */
      unsetCommentMark: (commentId: string) => ReturnType;
      /**
       * Update comment mark attributes
       */
      updateCommentMark: (commentId: string, attributes: { resolved?: boolean; draft?: boolean }) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: "commentMark",

  addOptions() {
    return {
      HTMLAttributes: {},
      documentId: "",
      onCommentClick: undefined,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            "data-comment-id": attributes.id,
          };
        },
      },
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-user-id"),
        renderHTML: (attributes) => {
          if (!attributes.userId) {
            return {};
          }
          return {
            "data-user-id": attributes.userId,
          };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-resolved") === "true",
        renderHTML: (attributes) => {
          return {
            "data-resolved": attributes.resolved ? "true" : "false",
          };
        },
      },
      draft: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-draft") === "true",
        renderHTML: (attributes) => {
          return {
            "data-draft": attributes.draft ? "true" : "false",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.comment-mark",
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          // Only parse marks from the same document
          if (element.dataset.documentId !== this.options.documentId) {
            return false;
          }
          return {
            id: element.dataset.commentId,
            userId: element.dataset.userId,
            resolved: element.dataset.resolved === "true",
            draft: element.dataset.draft === "true",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { id, userId, resolved, draft } = HTMLAttributes;

    // Determine CSS class based on state
    let className = "comment-mark";
    if (draft) {
      className += " comment-mark-draft";
    } else if (resolved) {
      className += " comment-mark-resolved";
    } else {
      className += " comment-mark-active";
    }

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, {
        class: className,
        "data-document-id": this.options.documentId,
        "data-comment-id": id,
        "data-user-id": userId,
        "data-resolved": resolved ? "true" : "false",
        "data-draft": draft ? "true" : "false",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCommentMark:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleCommentMark:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetCommentMark:
        (commentId) =>
        ({ tr, state }) => {
          const { doc, selection } = state;
          const { from, to } = selection;

          let markFound = false;

          doc.nodesBetween(0, doc.content.size, (node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.id === commentId) {
                const markFrom = pos;
                const markTo = pos + node.nodeSize;

                tr.removeMark(markFrom, markTo, mark.type);
                markFound = true;
              }
            });
          });

          return markFound;
        },
      updateCommentMark:
        (commentId, attributes) =>
        ({ tr, state }) => {
          const { doc } = state;

          doc.nodesBetween(0, doc.content.size, (node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.id === commentId) {
                const markFrom = pos;
                const markTo = pos + node.nodeSize;

                const newMark = mark.type.create({
                  ...mark.attrs,
                  ...attributes,
                });

                tr.removeMark(markFrom, markTo, mark.type).addMark(markFrom, markTo, newMark);
              }
            });
          });

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { onCommentClick } = this.options;

    return [
      new Plugin({
        props: {
          handleClick: (view: any, pos: number, event: MouseEvent) => {
            const { doc } = view.state;
            const clickedNode = doc.nodeAt(pos);

            if (clickedNode) {
              const commentMark = clickedNode.marks.find((mark: any) => mark.type.name === this.name);

              if (commentMark && onCommentClick) {
                event.preventDefault();
                onCommentClick(commentMark.attrs.id);
                return true;
              }
            }

            return false;
          },
          // Prevent copying comment marks to other documents
          transformCopied: (slice: any) => {
            const removeMarks = (fragment: any): any => {
              const mapped: any[] = [];
              fragment.forEach((node: any) => {
                let newNode = node;

                if (node.content) {
                  newNode = node.copy(removeMarks(node.content));
                }

                // Remove comment marks when copying
                newNode.marks = node.marks.filter((mark: any) => mark.type.name !== this.name);

                mapped.push(newNode);
              });
              return Fragment.from(mapped);
            };

            return new Slice(removeMarks(slice.content), slice.openStart, slice.openEnd);
          },
        },
      }),
    ];
  },
});
