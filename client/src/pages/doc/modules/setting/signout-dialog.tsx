import { create } from "zustand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import useUserStore from "@/stores/user";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface SignOutStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useSignOutStore = create<SignOutStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export function useSignOutDialog() {
  const { onOpen } = useSignOutStore();
  return { onOpen };
}

export function SignOutDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOpen, onClose } = useSignOutStore();

  const handleSignOut = () => {
    useUserStore.getState().logout();
    onClose();
    navigate("/login");
  };

  return (
    // https://github.com/shadcn-ui/ui/issues/1859
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Are you sure you want to sign out?")}</AlertDialogTitle>
          <AlertDialogDescription>{t("You will be logged out of your account and will need to sign in again to access your data.")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSignOut}>{t("Sign Out")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
