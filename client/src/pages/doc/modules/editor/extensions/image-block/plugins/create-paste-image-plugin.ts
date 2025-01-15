import { uploadFile } from "@/lib/upload";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Editor } from "@tiptap/react";
import { findPlaceholder } from "./create-placeholder-plugin";
import { v4 as uuidv4 } from "uuid";

export function createPasteImagePlugin({
  editor,
  placeholderPlugin,
}: {
  editor: Editor;
  placeholderPlugin: Plugin;
}) {
  return new Plugin({
    key: new PluginKey("imagePasteHandlerPlugin"),
    props: {
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter((item) => item.type.startsWith("image"));

        if (!imageItems.length) return false;

        event.preventDefault();

        imageItems.forEach(async (imageItem) => {
          const file = imageItem.getAsFile();
          if (!file) return;

          const id = uuidv4();
          if (!file.type.startsWith("image/")) return;

          const previewUrl = URL.createObjectURL(file);

          const tr = view.state.tr;
          tr.setMeta(placeholderPlugin, {
            add: {
              id,
              pos: tr.selection.from,
              previewUrl,
            },
          });
          view.dispatch(tr);

          try {
            const { downloadUrl } = await uploadFile({ file, ext: file.name.split(".").pop() || "png" });

            const pos = findPlaceholder(placeholderPlugin, view.state, id);
            if (pos == null) return;

            view.dispatch(
              view.state.tr.replaceWith(pos, pos, editor.schema.nodes.imageBlock.create({ src: downloadUrl })).setMeta(placeholderPlugin, { remove: { id } }),
            );
          } catch (error) {
            console.error("Failed to upload pasted image:", error);
            view.dispatch(tr.setMeta(placeholderPlugin, { remove: { id } }));
          } finally {
            URL.revokeObjectURL(previewUrl);
          }
        });

        return true;
      },
    },
  });
}
