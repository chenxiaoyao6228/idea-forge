import { ButtonProps } from "@/components/ui/button";

export interface ConfirmModalProps {
  // basic info
  title?: string;
  description?: string;
  children?: React.ReactNode;

  // button related
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonProps["variant"];
  cancelVariant?: ButtonProps["variant"];
  hideCancel?: boolean;

  // style related
  width?: number;
  className?: string;
  icon?: React.ReactNode;

  // callback functions
  onConfirm?: () => Promise<boolean> | boolean;
  onCancel?: () => Promise<boolean> | boolean;

  // type
  type?: "alert" | "dialog";

  // react-confirm
  show?: boolean;
  proceed?: (value: boolean) => void;
}
