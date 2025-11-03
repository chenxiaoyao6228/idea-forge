import { Bell, Users, Inbox, Bookmark } from "lucide-react";
import { Label } from '@idea/ui/shadcn/ui/label';
import { Switch } from '@idea/ui/shadcn/ui/switch';
import { Separator } from '@idea/ui/shadcn/ui/separator';
import { Alert, AlertDescription } from '@idea/ui/shadcn/ui/alert';
import { showConfirmModal } from '@/components/ui/confirm-modal';
import { useFetchNotificationSettings, useUpdateCategorySetting } from "@/stores/notification-store";
import type { NotificationCategory } from "@idea/contracts";
import { useTranslation } from "react-i18next";

interface CategoryInfo {
  category: NotificationCategory;
  icon: React.ReactNode;
  label: string;
  description: string;
  isActionRequired: boolean;
}

const NOTIFICATION_CATEGORIES: CategoryInfo[] = [
  {
    category: "MENTIONS",
    icon: <Bell className="h-5 w-5 text-orange-500" />,
    label: "Mentions",
    description: "Receive notifications when you are mentioned in documents",
    isActionRequired: false,
  },
  {
    category: "SHARING",
    icon: <Users className="h-5 w-5 text-blue-500" />,
    label: "Sharing",
    description: "Permission requests, grants, and rejections",
    isActionRequired: true,
  },
  {
    category: "INBOX",
    icon: <Inbox className="h-5 w-5 text-green-500" />,
    label: "Inbox",
    description: "Workspace and subspace invitations",
    isActionRequired: true,
  },
  {
    category: "SUBSCRIBE",
    icon: <Bookmark className="h-5 w-5 text-purple-500" />,
    label: "Subscribe",
    description: "Updates on documents you're following",
    isActionRequired: false,
  },
];

export const General = () => {
  const { t } = useTranslation();
  const { data: settings, error, run: refetchSettings } = useFetchNotificationSettings();
  const { run: updateSetting, loading: updating } = useUpdateCategorySetting(refetchSettings);

  // Get enabled state for a category
  const isCategoryEnabled = (category: NotificationCategory): boolean => {
    const categorySetting = settings?.settings.find((s) => s.category === category);
    return categorySetting?.enabled ?? true; // Default enabled
  };

  // Handle toggle change
  const handleToggleChange = async (category: NotificationCategory, enabled: boolean, isActionRequired: boolean) => {
    // If disabling an action-required category, show warning first
    if (!enabled && isActionRequired) {
      const categoryName = category.charAt(0) + category.slice(1).toLowerCase();

      let warningMessage = "";
      if (category === "SHARING") {
        warningMessage = t("You will not receive permission requests and notifications about sharing activities.");
      } else if (category === "INBOX") {
        warningMessage = t("You will not receive workspace and subspace invitation notifications.");
      }

      const confirmed = await showConfirmModal({
        type: "alert",
        confirmVariant: "destructive",
        title: t(`Disable ${categoryName} Notifications?`),
        content: (
          <p>{t("You are about to disable notifications for important events. {{warningMessage}} Are you sure you want to continue?", { warningMessage })}</p>
        ),
        confirmText: t("Disable Notifications"),
        cancelText: t("Cancel"),
      });

      if (confirmed) {
        updateSetting({ category, enabled: false });
      }
    } else {
      // Directly update for non-action-required categories or when enabling
      updateSetting({ category, enabled });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General Settings</h3>
      </div>

      <Separator />

      {/* Notification Preferences Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-base font-medium">Notification Preferences</h4>
          <p className="text-sm text-muted-foreground">Control which types of notifications you want to receive</p>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load notification settings. Please try refreshing the page.</AlertDescription>
          </Alert>
        )}

        {/* Settings List */}
        {!error && settings && (
          <div className="space-y-1">
            {NOTIFICATION_CATEGORIES.map((categoryInfo) => {
              const enabled = isCategoryEnabled(categoryInfo.category);

              return (
                <div key={categoryInfo.category} className="flex items-center justify-between py-3 hover:bg-accent/50 px-3 rounded-md transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{categoryInfo.icon}</div>
                    <div className="flex-1">
                      <Label className="text-sm font-medium cursor-pointer">{categoryInfo.label}</Label>
                      <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggleChange(categoryInfo.category, checked, categoryInfo.isActionRequired)}
                    disabled={updating}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Info Note */}
        {!error && (
          <Alert>
            <AlertDescription className="text-sm">
              These settings apply to all your workspaces. You can enable or disable notification categories at any time.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
