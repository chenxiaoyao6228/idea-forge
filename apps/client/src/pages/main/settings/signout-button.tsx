import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { confirmModal } from "@/components/ui/confirm-modal";
import useUserStore from "@/stores/user";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await confirmModal({
      title: t("Are you sure you want to sign out?"),
      description: t("You will be logged out of your account and will need to sign in again to access your data."),
      confirmText: t("Sign Out"),
      cancelText: t("Cancel"),
      confirmVariant: "destructive",
      async onConfirm() {
        await useUserStore.getState().logout();
        navigate("/login");
        return false;
      },
    });
  };

  return (
    <div className="flex items-center gap-2 px-1 py-0 text-left text-sm" onClick={handleSignOut}>
      <Button variant="destructive" size="sm">
        <LogOut className="h-4 w-4" />
        <span className="ml-2">{t("Sign Out")}</span>
      </Button>
    </div>
  );
}
