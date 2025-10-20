import { mergeAttributes } from "@tiptap/core";
import TiptapHorizontalRule from "@tiptap/extension-horizontal-rule";

export const HorizontalRule = TiptapHorizontalRule.extend({
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": this.name }), ["hr"]];
  },
});

export default HorizontalRule;
