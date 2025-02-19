import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

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
            return false;
          },
        },
      }),
    ];
  },
});
