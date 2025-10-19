import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { showConfirmModal } from '@/components/ui/confirm-modal';
import { useLogout } from "@/stores/user-store";
import { Button } from '@idea/ui/shadcn/ui/button';

export function SignOutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { run: logout } = useLogout();

  const handleSignOut = async () => {
    await showConfirmModal({
      title: t("Are you sure you want to sign out?"),
      description: t("You will be logged out of your account and will need to sign in again to access your data."),
      confirmText: t("Sign Out"),
      cancelText: t("Cancel"),
      confirmVariant: "destructive",
      async onConfirm() {
        await logout();
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
