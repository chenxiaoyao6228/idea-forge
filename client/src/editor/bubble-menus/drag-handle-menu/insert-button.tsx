import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { IButtonProps } from "./type";
import { useTranslation } from "react-i18next";

export default function InsertNodeButton(props: IButtonProps) {
  const { editor, currentNode, currentNodePos } = props;
  const { t } = useTranslation();

  // Early return if editor is not initialized
  if (!editor) return null;

  /**
   * Handles the insertion of a new node or conversion to slash command
   * - For empty paragraphs: Converts to slash command for quick block insertion
   * - For non-empty nodes: Inserts a new paragraph after the current node
   */
  const handleInsertNode = useCallback(() => {
    if (currentNodePos === -1) return;

    // Calculate positions for node insertion
    const nodeSize = currentNode?.nodeSize || 0;
    const insertPosition = currentNodePos + nodeSize;

    // Check if current node is an empty paragraph
    const isNodeEmptyParagraph = currentNode?.type.name === "paragraph" && currentNode?.content?.size === 0;

    // Calculate where to place cursor after insertion
    // +2 for slash command, +1 for new paragraph
    const focusPosition = isNodeEmptyParagraph ? currentNodePos + 2 : insertPosition + 1;

    editor
      ?.chain()
      .command(({ dispatch, tr, state }) => {
        if (!dispatch) return true;

        if (isNodeEmptyParagraph) {
          // Convert empty paragraph to slash command
          tr.insertText("/", currentNodePos, currentNodePos + 1);
        } else {
          // Insert new paragraph after current node
          tr.insert(insertPosition, state.schema.nodes.paragraph.create(null));
        }

        return dispatch(tr);
      })
      // Move cursor to appropriate position after insertion
      .focus(focusPosition)
      .run();
  }, [currentNode, currentNodePos, editor]);

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleInsertNode}
      tabIndex={-1}
      title={t("Insert new block")}
      aria-label={t("Insert new block")}
      className="px-1"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}
