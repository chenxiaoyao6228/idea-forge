import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/*
This Selection plugin has several specific uses:

Selection Visualization When Inactive
Maintains visual effect of selected text when editor loses focus (!editor.isFocused)
Particularly useful in collaborative editing scenarios to show other users' selection positions

Collaborative Editing Support 
Can distinguish different users' selections by adding data-user-id attribute
Can display different colors/styles for different users' selections

Custom Selection Behavior
Can control which node types (like code blocks, images) don't show selection effects
Can set minimum selection length to avoid accidental selection display

Enhanced User Experience
Users can still see previously selected content even when editor loses focus
Especially useful when referencing content in other windows without losing current selection position
Example use cases:
*/

export const Selection = Extension.create({
  name: "selection",

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: new PluginKey("selection"),
        props: {
          decorations(state) {
            if (state.selection.empty) return null;
            if (editor.isFocused === true) return null;

            // Add CSS class 'selection' to the selected area
            return DecorationSet.create(state.doc, [
              Decoration.inline(state.selection.from, state.selection.to, {
                class: "selection",
              }),
            ]);
          },
        },
      }),
    ];
  },
});

export default Selection;
