import { Image as TImage } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { mergeAttributes, type Range } from "@tiptap/core";
import ImageBlockView from "./image-block-view";
import { unwrap, wrap } from "../markdown/plugins/wrap";
import { createPasteImagePlugin } from "./create-paste-image-plugin";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attributes: { src: string; uploadId?: string; isUploading?: boolean }) => ReturnType;
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
      uploadId: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      isUploading: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
      alt: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("alt"),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
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
    };
  },

  addCommands() {
    return {
      setImageBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "imageBlock",
            attrs: { src: attrs.src, uploadId: attrs.uploadId, isUploading: attrs.isUploading },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },

  addProseMirrorPlugins() {
    return [createPasteImagePlugin({ editor: this.editor })];
  },
});

export default ImageBlock;
