import { Mark } from "@tiptap/core";

export const HighlightMark = Mark.create({
  name: "highlight",

  addAttributes() {
    return {
      class: {
        default: "highlight-mark",
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => ({
          class: attributes.class,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.highlight-mark",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});
