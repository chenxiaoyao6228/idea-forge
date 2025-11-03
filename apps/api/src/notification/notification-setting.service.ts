import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import {
  NotificationEventType,
  type NotificationCategory,
  type CategorySettings,
  type GetNotificationSettingsResponse,
  type UpdateCategorySettingsResponse,
  getCategoryEventTypes,
} from "@idea/contracts";

/**
 * Service for managing user notification preference settings
 */
@Injectable()
export class NotificationSettingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's notification settings grouped by category
   * Returns default enabled state for categories without explicit settings
   */
  async getUserSettings(userId: string): Promise<GetNotificationSettingsResponse> {
    // Fetch all notification settings for the user
    const userSettings = await this.prisma.notificationSetting.findMany({
      where: { userId },
    });

    // Build settings map: eventType -> enabled
    const settingsMap = new Map<string, boolean>();
    for (const setting of userSettings) {
      settingsMap.set(setting.eventType, setting.webEnabled);
    }

    // Build category settings for all 4 categories
    const categories: NotificationCategory[] = ["MENTIONS", "SHARING", "INBOX", "SUBSCRIBE"];
    const categorySettings: CategorySettings[] = [];

    for (const category of categories) {
      const eventTypes = getCategoryEventTypes(category);

      // Category is enabled if ALL its events are enabled (or no settings exist = default enabled)
      let enabled = true;
      if (eventTypes.length > 0) {
        // Check if any event is explicitly disabled
        for (const eventType of eventTypes) {
          if (settingsMap.has(eventType) && !settingsMap.get(eventType)) {
            enabled = false;
            break;
          }
        }
      } else {
        // Category has no events (MENTIONS, SUBSCRIBE in Phase 1)
        // Check if there's an explicit setting for the category itself
        const categorySetting = userSettings.find((s) => s.eventType === category);
        enabled = categorySetting ? categorySetting.webEnabled : true; // Default enabled
      }

      categorySettings.push({
        category,
        enabled,
        eventTypes,
      });
    }

    return {
      settings: categorySettings,
    };
  }

  /**
   * Update notification settings for an entire category
   * Creates/updates NotificationSetting records for all events in the category
   */
  async updateCategorySettings(userId: string, category: NotificationCategory, enabled: boolean): Promise<UpdateCategorySettingsResponse> {
    const eventTypes = getCategoryEventTypes(category);

    // If category has no events yet (MENTIONS, SUBSCRIBE), store category-level setting
    if (eventTypes.length === 0) {
      await this.prisma.notificationSetting.upsert({
        where: {
          userId_eventType: {
            userId,
            eventType: category, // Store category name as eventType placeholder
          },
        },
        update: {
          webEnabled: enabled,
          updatedAt: new Date(),
        },
        create: {
          userId,
          eventType: category,
          webEnabled: enabled,
        },
      });
    } else {
      // Category has events - update each event's setting
      for (const eventType of eventTypes) {
        await this.prisma.notificationSetting.upsert({
          where: {
            userId_eventType: {
              userId,
              eventType,
            },
          },
          update: {
            webEnabled: enabled,
            updatedAt: new Date(),
          },
          create: {
            userId,
            eventType,
            webEnabled: enabled,
          },
        });
      }
    }

    // Return updated settings for this category
    return {
      success: true,
      settings: {
        category,
        enabled,
        eventTypes,
      },
    };
  }

  /**
   * Get default notification settings (all categories enabled)
   * Used for new users or when no explicit settings exist
   */
  getDefaultSettings(): GetNotificationSettingsResponse {
    const categories: NotificationCategory[] = ["MENTIONS", "SHARING", "INBOX", "SUBSCRIBE"];

    const categorySettings: CategorySettings[] = categories.map((category) => ({
      category,
      enabled: true, // All categories enabled by default (opt-out model)
      eventTypes: getCategoryEventTypes(category),
    }));

    return {
      settings: categorySettings,
    };
  }

  /**
   * Check if a specific notification event type is enabled for a user
   * Used during notification creation to determine if notification should be sent
   *
   * @returns true if enabled (or no setting exists = default enabled), false if explicitly disabled
   */
  async isNotificationEnabled(userId: string, eventType: NotificationEventType): Promise<boolean> {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
    });

    // Default to enabled if no setting exists (opt-out model)
    return setting ? setting.webEnabled : true;
  }
}
