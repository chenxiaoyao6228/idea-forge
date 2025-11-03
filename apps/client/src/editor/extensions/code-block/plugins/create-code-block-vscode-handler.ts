import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import type { NodeType } from "@tiptap/pm/model";

export function createCodeBlockVSCodeHandler(type: NodeType) {
  return new Plugin({
    key: new PluginKey("codeBlockVSCodeHandler"),
    props: {
      handlePaste: (view, event) => {
        if (!event.clipboardData) {
          return false;
        }

        // don't create a new code block within code blocks
        if (view.state.selection.$from.parent.type === type) {
          return false;
        }

        const text = event.clipboardData.getData("text/plain");
        const vscode = event.clipboardData.getData("vscode-editor-data");
        const vscodeData = vscode ? JSON.parse(vscode) : undefined;
        const language = vscodeData?.mode;

        if (!text || !language) {
          return false;
        }

        const { tr, schema } = view.state;

        // prepare a text node
        // strip carriage return chars from text pasted as code
        // see: https://github.com/ProseMirror/prosemirror-view/commit/a50a6bcceb4ce52ac8fcc6162488d8875613aacd
        const textNode = schema.text(text.replace(/\r\n?/g, "\n"));

        // create a code block with the text node
        // replace selection with the code block
        // Use detected language or default to plain text
        tr.replaceSelectionWith(type.create({ language: language || "plaintext" }, textNode));

        if (tr.selection.$from.parent.type !== type) {
          // put cursor inside the newly created code block
          tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(0, tr.selection.from - 2))));
        }

        // store meta information
        // this is useful for other plugins that depends on the paste event
        // like the paste rule plugin
        tr.setMeta("paste", true);

        view.dispatch(tr);

        return true;
      },
    },
  });
}
