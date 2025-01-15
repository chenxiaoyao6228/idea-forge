import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const placeholderPluginKey = new PluginKey("imageUploadPlaceholder");

/*
  Reason for decoration instead of node to create placeholder
  - collaboration friendly, decoration won't sync to other clients
*/
export function createPlaceholderPlugin() {
  return new Plugin({
    key: placeholderPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, decorationSet) {
        const newSet = decorationSet.map(tr.mapping, tr.doc);
        const action = tr.getMeta(placeholderPluginKey);

        if (action?.add) {
          const widget = document.createElement("div");
          const img = document.createElement("img");
          widget.classList.value = "image-uploading";
          img.src = action.add.previewUrl;
          widget.appendChild(img);

          const deco = Decoration.widget(action.add.pos, widget, {
            id: action.add.id,
          });
          return newSet.add(tr.doc, [deco]);
        }

        if (action?.remove) {
          return newSet.remove(newSet.find(undefined, undefined, (spec) => spec.id === action.remove.id));
        }

        return newSet;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

export function findPlaceholder(plugin: Plugin, state: EditorState, id: string) {
  const decorations = plugin.getState(state);
  const found = decorations?.find(undefined, undefined, (spec: any) => spec.id === id);
  return found?.length ? found[0].from : null;
}
