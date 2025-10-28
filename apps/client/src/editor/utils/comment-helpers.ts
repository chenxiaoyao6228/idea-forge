import { Editor } from "@tiptap/react";

export interface CommentMark {
  id: string;
  userId: string;
  draft?: boolean;
  resolved?: boolean;
  text: string;
}

/**
 * Extracts all comment marks from the editor document
 */
export function getCommentMarks(editor: Editor | null): CommentMark[] {
  if (!editor) return [];

  const comments: CommentMark[] = [];
  const { doc } = editor.state;

  doc.descendants((node) => {
    // Check if this node has comment marks
    node.marks.forEach((mark) => {
      if (mark.type.name === "commentMark") {
        comments.push({
          id: mark.attrs.id,
          userId: mark.attrs.userId,
          draft: mark.attrs.draft,
          resolved: mark.attrs.resolved,
          text: node.textContent,
        });
      }
    });
    return true;
  });

  return comments;
}

/**
 * Gets the anchor text for a specific comment by ID
 */
export function getAnchorTextForComment(editor: Editor | null, commentId: string): string | undefined {
  const marks = getCommentMarks(editor);
  const anchorTexts = marks.filter((mark) => mark.id === commentId).map((mark) => mark.text);

  return anchorTexts.length ? anchorTexts.join("") : undefined;
}
