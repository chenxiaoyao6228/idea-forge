-- Convert NotificationEventType enum to String
ALTER TABLE "Notification"
  ALTER COLUMN "event" TYPE TEXT USING "event"::TEXT;

-- Convert ActionType enum to String (nullable)
ALTER TABLE "Notification"
  ALTER COLUMN "actionType" TYPE TEXT USING "actionType"::TEXT;

-- Convert ActionStatus enum to String with default
ALTER TABLE "Notification"
  ALTER COLUMN "actionStatus" TYPE TEXT USING "actionStatus"::TEXT,
  ALTER COLUMN "actionStatus" SET DEFAULT 'PENDING';

-- Convert NotificationSetting eventType to String
ALTER TABLE "NotificationSetting"
  ALTER COLUMN "eventType" TYPE TEXT USING "eventType"::TEXT;

-- Drop the enum types (only after all columns are converted)
DROP TYPE IF EXISTS "NotificationEventType";
DROP TYPE IF EXISTS "ActionType";
DROP TYPE IF EXISTS "ActionStatus";
