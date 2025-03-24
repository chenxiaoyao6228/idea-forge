import { Editor, Extension } from "@tiptap/core";

export const AutoFocus = Extension.create({
  name: "autoFocus",

  onCreate() {
    setTimeout(() => {
      const content = this.editor.getText().trim();

      if (!content.length) {
        this.editor.commands.focus();
      } else {
        this.editor.commands.blur();
      }
    }, 32);
  },
});
