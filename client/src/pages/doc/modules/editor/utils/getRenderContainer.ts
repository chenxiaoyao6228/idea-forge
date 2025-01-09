import type { Editor } from "@tiptap/react";

export function getRenderContainer(editor: Editor, nodeType: string): HTMLElement | null {
  const {
    view,
    state: {
      selection: { from },
    },
  } = editor;

  // First try to find node among focused elements
  const focusedElements = document.querySelectorAll<HTMLElement>(".has-focus");
  const lastFocusedElement = focusedElements[focusedElements.length - 1];

  if (isMatchingNode(lastFocusedElement)) {
    return lastFocusedElement;
  }

  // If not found, traverse up from selection position
  const domNode = view.domAtPos(from).node as HTMLElement;
  const startNode = domNode.tagName ? domNode : domNode.parentElement!;

  return findParentMatchingNode(startNode);

  function isMatchingNode(element: HTMLElement | null): boolean {
    if (!element) return false;
    return element.getAttribute("data-type") === nodeType || element.classList.contains(nodeType);
  }

  function findParentMatchingNode(startNode: HTMLElement): HTMLElement | null {
    let currentNode = startNode;

    while (currentNode && !isMatchingNode(currentNode)) {
      if (!currentNode.parentElement) break;
      currentNode = currentNode.parentElement;
    }

    return currentNode;
  }
}

export default getRenderContainer;
