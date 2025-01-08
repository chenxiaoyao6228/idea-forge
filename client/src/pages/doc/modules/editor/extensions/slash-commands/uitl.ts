import { ResolvedPos } from "@tiptap/pm/model";

export function calculateStartPosition($head: ResolvedPos, end: number, $from: ResolvedPos): number {
  if (!$head?.nodeBefore?.text) return $from.start();

  const text = $head.nodeBefore.text;
  const slashIndex = text.lastIndexOf("/");

  // If no slash is found or slash is at the start, return the full text length
  if (slashIndex === -1) return end - text.length;

  // Return the length from slash to end
  return end - text.substring(slashIndex).length;
}
