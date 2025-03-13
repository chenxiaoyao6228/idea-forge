import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import useUserStore from "@/stores/user";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function SignOutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    useUserStore.getState().logout();
    navigate("/login");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="flex items-center gap-2 px-1 py-0 text-left text-sm cursor-pointer">
          <LogOut className="h-4 w-4" />
          <span className="ml-2">{t("Sign Out")}</span>
        </div>
      </AlertDialogTrigger>
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
