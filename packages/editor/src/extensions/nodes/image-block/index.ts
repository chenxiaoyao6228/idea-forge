import { Image as TImage } from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import type { NodeMarkdownStorage } from "../../../markdown/types";

export interface ImageBlockOptions {
  /**
   * HTML attributes to add to the image element.
   * @default {}
   */
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      /**
       * Insert an image block with specified attributes
       */
      setImageBlock: (attributes: {
        src: string;
        alignment?: string;
        width?: number;
        height?: number;
        aspectRatio?: number;
      }) => ReturnType;
      /**
       * Insert a local image (client-specific, needs to be implemented by extending extension)
       */
      insertLocalImage: () => ReturnType;
      /**
       * Set image alignment
       */
      setImageAlignment: (alignment: "left" | "center" | "right") => ReturnType;
      /**
       * Set image size
       */
      setImageSize: (size: {
        width: number;
        height: number;
        aspectRatio?: number;
      }) => ReturnType;
    };
  }
}

export const ImageBlock = TImage.extend<ImageBlockOptions>({
  name: "imageBlock",

  group: "block",

  defining: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

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
      ...this.parent?.(),
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
    } satisfies NodeMarkdownStorage;
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

      // Default implementation - client should override this
      insertLocalImage: () => () => {
        console.warn("insertLocalImage command not implemented. Override this in client extension.");
        return false;
      },
    };
  },

  // Client can override addNodeView() to provide React NodeView
  // Client can override addProseMirrorPlugins() to provide placeholder and paste plugins
});
