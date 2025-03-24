import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// define heading shortcuts
const HEADING_SHORTCUTS = {
  "0": 0, // add 0 for paragraph
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
} as const;

export const CustomKeys = Extension.create({
  name: "customKeys",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("customKeys"),
        props: {
          handleKeyDown: (view, event) => {
            // Check if Mod+S is pressed
            if ((event.ctrlKey || event.metaKey) && event.key === "s") {
              event.preventDefault();
              return true;
            }

            // Check if Command/Control + number (0-6) is pressed
            if ((event.metaKey || event.ctrlKey) && /^[0-6]$/.test(event.key)) {
              const level = HEADING_SHORTCUTS[event.key as keyof typeof HEADING_SHORTCUTS];
              const { state, dispatch } = view;

              // if 0, set to paragraph
              if (level === 0) {
                const tr = state.tr.setBlockType(state.selection.from, state.selection.to, state.schema.nodes.paragraph);
                dispatch(tr);
                return true;
              }

              // handle heading switch
              const isHeading = state.selection.$head.parent.type.name === "heading" && state.selection.$head.parent.attrs.level === level;

              const type = isHeading ? state.schema.nodes.paragraph : state.schema.nodes.heading;

              const attrs = isHeading ? {} : { level };

              const tr = state.tr.setBlockType(state.selection.from, state.selection.to, type, attrs);

              dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
