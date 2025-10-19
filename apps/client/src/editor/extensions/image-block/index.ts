import { Image as TImage } from "@tiptap/extension-image";
import { Editor, ReactNodeViewRenderer } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import ImageBlockView from "./image-block-view";
import { createPasteImagePlugin } from "./plugins/create-paste-image-plugin";
import { fileOpen } from "@/lib/filesystem";
import { uploadFile } from "@/lib/upload";
import { findPlaceholder, createPlaceholderPlugin } from "./plugins/create-placeholder-plugin";
import { v4 as uuidv4 } from "uuid";
import { getImageDimensionsFromFile } from "@/lib/image";
import { calculateInitialSize } from "./util";
import type { NodeMarkdownStorage } from "../markdown/types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attributes: {
        src: string;
        alignment?: string;
        width?: number;
        height?: number;
        aspectRatio?: number;
      }) => ReturnType;
      insertLocalImage: () => ReturnType;
      setImageAlignment: (alignment: "left" | "center" | "right") => ReturnType;
      setImageSize: (size: {
        width: number;
        height: number;
        aspectRatio?: number;
      }) => ReturnType;
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
        default: "left",
        parseHTML: (element) => element.getAttribute("data-alignment") || "left",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
          class: `image-align-${attributes.alignment}`,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute("width");
          return width ? Number.parseInt(width, 10) : null;
        },
        renderHTML: (attributes) => ({
          width: attributes.width,
          style: `width: ${attributes.width}px`,
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute("height");
          return height ? Number.parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => ({
          height: attributes.height,
          style: `height: ${attributes.height}px`,
        }),
      },
      aspectRatio: {
        default: null,
        parseHTML: (element) => {
          const ratio = element.getAttribute("data-aspect-ratio");
          return ratio ? Number.parseFloat(ratio) : null;
        },
        renderHTML: (attributes) => ({
          "data-aspect-ratio": attributes.aspectRatio,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "image",
          apply: (state, node, type) => {
            state.addNode(type, {
              src: node.url,
              alt: node.alt,
            });
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.addNode({
              type: "image",
              url: node.attrs.src,
              alt: node.attrs.alt || "",
            });
          },
        },
      },
      placeholderPlugin: null,
    } as NodeMarkdownStorage & { placeholderPlugin: any };
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
              alignment: attrs.alignment || "left",
              width: attrs.width,
              height: attrs.height,
              aspectRatio: attrs.aspectRatio,
            },
          });
        },

      setImageAlignment:
        (alignment) =>
        ({ commands, editor }) => {
          if (!editor.isActive("imageBlock")) return false;
          return commands.updateAttributes("imageBlock", { alignment });
        },

      setImageSize:
        (size) =>
        ({ commands, editor }) => {
          if (!editor.isActive("imageBlock")) return false;
          return commands.updateAttributes("imageBlock", {
            width: size.width,
            height: size.height,
            aspectRatio: size.aspectRatio,
          });
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

              const { width: originalWidth, height: originalHeight } = await getImageDimensionsFromFile(file);
              const aspectRatio = originalWidth / originalHeight;

              const editorWidth = (document.querySelector(".ProseMirror")?.clientWidth ?? 0) - 80;

              const { width, height } = calculateInitialSize(originalWidth, originalHeight, editorWidth);

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

              const { downloadUrl } = await uploadFile({
                file,
              });

              const pos = findPlaceholder(this.storage.placeholderPlugin, view.state, id);
              if (pos == null) return;

              view.dispatch(
                view.state.tr
                  .replaceWith(
                    pos,
                    pos,
                    this.type.create({
                      src: downloadUrl,
                      width,
                      height,
                      aspectRatio,
                    }),
                  )
                  .setMeta(this.storage.placeholderPlugin, { remove: { id } }),
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
      editor: this.editor as Editor,
      placeholderPlugin: placeholder,
    });
    return [placeholder, paste];
  },
});

export default ImageBlock;
