/*
 * Shadcn Dialog inside of Dropdown closes automatically, see:
 * https://stackoverflow.com/questions/77185827/shadcn-dialog-inside-of-dropdown-closes-automatically
 * So we use react-confirm to create a custom confirm modal, instead of using AlertDialog/Dialog directly from shadcn/ui
 */

import { createConfirmation } from "react-confirm";
import ConfirmModal from "./modal";
import type { ConfirmModalProps } from "./types";

const confirmModal = createConfirmation(ConfirmModal);

export async function showConfirmModal(options: Omit<ConfirmModalProps, "show" | "proceed"> = {}): Promise<boolean> {
  return confirmModal(options);
}
