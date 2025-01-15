import { Image as TImage } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { mergeAttributes, type Range } from "@tiptap/core";
import ImageBlockView from "./image-block-view";
import { unwrap, wrap } from "../markdown/plugins/wrap";
import { createPasteImagePlugin } from "./plugins/create-paste-image-plugin";
import { fileOpen } from "@/lib/filesystem";
import { uploadFile } from "@/lib/upload";
import { findPlaceholder, createPlaceholderPlugin } from "./plugins/create-placeholder-plugin";
import { v4 as uuidv4 } from "uuid";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attributes: { src: string; alignment?: string }) => ReturnType;
      insertLocalImage: () => ReturnType;
      setImageAlignment: (alignment: "left" | "center" | "right") => ReturnType;
    };
  }
}

const ImageBlock = TImage.extend({
  name: "imageBlock",

  group: "block",

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      alt: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("alt"),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
          class: `image-align-${attributes.alignment}`,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "image",
          apply: (state, node, type) => {
            const src = node.url as string;
            const alt = node.alt as string;
            const title = node.title as string;
            state.addNode(type, {
              src,
              alt,
              title,
            });
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.addNode({
              type: "image",
              title: node.attrs.title,
              url: node.attrs.src,
              alt: node.attrs.alt,
            });
          },
        },
        hooks: {
          afterParse: (root) => (this.options.inline ? root : unwrap(root, (node) => node.type === "image")),
          beforeSerialize: (root) => (this.options.inline ? root : wrap(root, (node) => node.type === "image")),
        },
      },
      placeholderPlugin: null,
    };
  },

  addCommands() {
    return {
      setImageBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "imageBlock",
            attrs: {
              src: attrs.src,
              alignment: attrs.alignment || "center",
            },
          });
        },

      setImageAlignment:
        (alignment) =>
        ({ commands, editor }) => {
          if (!editor.isActive("imageBlock")) return false;
          return commands.updateAttributes("imageBlock", { alignment });
        },

      insertLocalImage:
        () =>
        ({ view }) => {
          void (async () => {
            try {
              const file = await fileOpen({
                extensions: ["jpg", "jpeg", "png", "gif", "webp"],
                description: "Image files",
              });

              const previewUrl = URL.createObjectURL(file);
              const id = uuidv4();

              const tr = view.state.tr;
              if (!tr.selection.empty) tr.deleteSelection();
              tr.setMeta(this.storage.placeholderPlugin, {
                add: {
                  id,
                  pos: tr.selection.from,
                  previewUrl,
                },
              });
              view.dispatch(tr);

              const { downloadUrl } = await uploadFile({ file, ext: file.name.split(".").pop() || "png" });

              const pos = findPlaceholder(this.storage.placeholderPlugin, view.state, id);
              if (pos == null) return;

              view.dispatch(
                view.state.tr.replaceWith(pos, pos, this.type.create({ src: downloadUrl })).setMeta(this.storage.placeholderPlugin, { remove: { id } }),
              );
            } catch (error) {
              console.error("Error uploading image:", error);
            }
          })();

          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },

  addProseMirrorPlugins() {
    const placeholder = createPlaceholderPlugin();
    // Store the placeholder plugin in the storage
    this.storage.placeholderPlugin = placeholder;
    const paste = createPasteImagePlugin({
      editor: this.editor,
      placeholderPlugin: placeholder,
    });
    return [placeholder, paste];
  },
});

export default ImageBlock;
