export function calculateInitialSize(originalWidth: number, originalHeight: number, editorWidth: number) {
  // Calculate aspect ratio (width/height)
  const aspectRatio = originalWidth / originalHeight;
  // Limit maximum height to 50% of viewport height
  const maxHeight = window.innerHeight * 0.5;

  let width: number;
  let height: number;

  // If image is very tall (aspect ratio < 0.7), limit width to 40% of editor width
  if (aspectRatio < 0.7) {
    width = Math.min(originalWidth, editorWidth * 0.4);
  }
  // If image is relatively square (0.7 <= aspect ratio <= 1.4), limit width to 60% of editor width
  else if (aspectRatio <= 1.4) {
    width = Math.min(originalWidth, editorWidth * 0.6);
  }
  // If image is wide (aspect ratio > 1.4), allow up to 100% of editor width
  else {
    width = Math.min(originalWidth, editorWidth);
  }

  // Calculate height while maintaining aspect ratio
  height = width / aspectRatio;

  // If calculated height exceeds max height, recalculate width to maintain aspect ratio
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}
