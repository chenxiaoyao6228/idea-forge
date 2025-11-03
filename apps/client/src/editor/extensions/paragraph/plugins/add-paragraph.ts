import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EDITOR_PADDING_BOTTOM } from "../../../constant";

interface ClickPosition {
  clientY: number;
  editorBottom: number;
  lastNodeBottom: number;
}

/**
 * AddParagraphExtension
 *
 * Problem: In rich text editors, users expect to create new paragraphs by clicking
 * empty spaces below content, similar to popular editors like Notion or Medium.
 * Default editor behavior doesn't support this interaction.
 *
 * Solution: This extension adds the ability to create new paragraphs when users
 * click either:
 * 1. The bottom padding area of the editor
 * 2. The space below the last content node
 */
const AddParagraph = Extension.create({
  name: "addParagraph",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("addParagraph"),
        props: {
          handleDOMEvents: {
            click: (view: EditorView, event: MouseEvent) => {
              return handleEditorClick(view, event);
            },
          },
        },
      }),
    ];
  },
});

/**
 * Determines if a new paragraph should be added based on click position
 */
function shouldAddParagraph(clickPosition: ClickPosition, lastNode: ProseMirrorNode | null): boolean {
  const { clientY, editorBottom, lastNodeBottom } = clickPosition;

  // Check if click is in bottom padding or below last node
  const isClickInBottomPadding = clientY > editorBottom - EDITOR_PADDING_BOTTOM;
  const isClickBelowLastNode = clientY > lastNodeBottom;

  // Don't add paragraph if last node is already an empty paragraph
  const isLastNodeEmptyParagraph = lastNode && lastNode.type.name === "paragraph" && lastNode.textContent === "";

  return (isClickInBottomPadding || isClickBelowLastNode) && !isLastNodeEmptyParagraph;
}

/**
 * Creates and inserts a new paragraph at the end of the document
 */
function insertNewParagraph(state: EditorState, dispatch: EditorView["dispatch"]): boolean {
  const { schema, tr, doc } = state;
  const endPos = doc.content.size;

  // Create and insert new paragraph
  const newParagraph = schema.nodes.paragraph.create();
  const transaction = tr.insert(endPos, newParagraph);

  // Set selection to start of new paragraph
  const resolvedPos = transaction.doc.resolve(endPos + 1);
  transaction.setSelection(TextSelection.near(resolvedPos));

  dispatch(transaction);
  return true;
}

/**
 * Handles click events in the editor
 */
function handleEditorClick(view: EditorView, event: MouseEvent): boolean {
  const { state, dispatch } = view;
  const { doc } = state;

  // Get relevant positions
  const editorElement = view.dom;
  const editorBounds = editorElement.getBoundingClientRect();
  const lastPos = doc.content.size;
  const lastCoords = view.coordsAtPos(lastPos);

  const clickPosition: ClickPosition = {
    clientY: event.clientY,
    editorBottom: editorBounds.bottom,
    lastNodeBottom: lastCoords.bottom,
  };

  if (shouldAddParagraph(clickPosition, doc.lastChild)) {
    insertNewParagraph(state, dispatch);
    view.focus();
    return true;
  }

  return false;
}

export default AddParagraph;
