import { formatDistanceToNow } from "date-fns";
import { FileText, UserPlus, CheckCircle2, XCircle, MessageSquare, AtSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { NotificationEntity } from "@/stores/notification-store";
import { Badge } from "@idea/ui/shadcn/ui/badge";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Card } from "@idea/ui/shadcn/ui/card";
import { cn } from "@idea/ui/shadcn/utils";
import { ViewportTracker } from "./viewport-tracker";
import { useViewportBatch } from "./viewport-batch-context";

interface NotificationItemProps {
  notification: NotificationEntity;
  onMarkAsRead?: (id: string) => void;
  onResolveAction?: (id: string, action: "approve" | "reject" | "accept" | "decline", reason?: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onResolveAction }: NotificationItemProps) {
  const navigate = useNavigate();
  const isUnread = !notification.viewedAt;
  const isActionRequired = notification.actionRequired && notification.actionStatus === "PENDING";
  const isCanceled = notification.actionStatus === "CANCELED";
  const { markAsViewed } = useViewportBatch();

  // Get icon based on event type
  const getIcon = () => {
    switch (notification.event) {
      case "PERMISSION_REQUEST":
        return <UserPlus className="h-4 w-4 text-orange-500" />;
      case "PERMISSION_GRANT":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "PERMISSION_REJECT":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "WORKSPACE_INVITATION":
      case "SUBSPACE_INVITATION":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "COMMENT_MENTION":
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case "COMMENT_CREATED":
      case "COMMENT_RESOLVED":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get notification title and description
  const getContent = () => {
    const metadata = notification.metadata as any;
    const actorName = metadata?.actorName || "Someone";
    const documentTitle = metadata?.documentTitle || "a document";

    switch (notification.event) {
      case "PERMISSION_REQUEST":
        return {
          title: "Permission request",
          description: `${actorName} requested ${metadata?.requestedPermission || "access"} permission to "${documentTitle}"`,
        };
      case "PERMISSION_GRANT":
        // Use custom message if available (e.g., workspace invitation acceptance)
        if (metadata?.message) {
          return {
            title: "Invitation accepted",
            description: metadata.message,
          };
        }
        return {
          title: "Permission granted",
          description: `${actorName} granted you ${metadata?.grantedPermission || "access"} permission to "${documentTitle}"`,
        };
      case "PERMISSION_REJECT":
        return {
          title: "Permission request rejected",
          description: `${actorName} rejected your request for "${documentTitle}"${metadata?.reason ? `: ${metadata.reason}` : ""}`,
        };
      case "WORKSPACE_INVITATION":
        return {
          title: "Workspace invitation",
          description: `${metadata?.inviterName || actorName} invited you to join ${metadata?.workspaceName || "a workspace"}`,
        };
      case "SUBSPACE_INVITATION":
        return {
          title: "Subspace invitation",
          description: `${metadata?.inviterName || actorName} invited you to join ${metadata?.subspaceName || "a subspace"}`,
        };
      case "COMMENT_MENTION":
        return {
          title: "Mentioned you in a comment",
          description: `${actorName} mentioned you in ${metadata?.isReply ? "a reply" : "a comment"} on "${documentTitle}"`,
        };
      case "COMMENT_CREATED":
        return {
          title: "New comment",
          description: `${actorName} commented on "${documentTitle}"`,
        };
      case "COMMENT_RESOLVED":
        return {
          title: "Comment resolved",
          description: `${actorName} resolved a comment thread on "${documentTitle}"`,
        };
      default:
        return {
          title: "Notification",
          description: metadata?.message || "You have a new notification",
        };
    }
  };

  const { title, description } = getContent();
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  const handleAction = (action: "approve" | "reject" | "accept" | "decline") => {
    if (onResolveAction) {
      onResolveAction(notification.id, action);
    }
  };

  const handleClick = () => {
    // Mark as read
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to document for comment notifications
    if (
      notification.documentId &&
      (notification.event === "COMMENT_MENTION" || notification.event === "COMMENT_CREATED" || notification.event === "COMMENT_RESOLVED")
    ) {
      // Get commentId from metadata to focus the specific comment
      const commentId = (notification.metadata as any)?.commentId;

      if (commentId) {
        // Navigate with commentId to open sidebar and focus the comment
        navigate(`/${notification.documentId}?commentId=${commentId}`);
      } else {
        // Fallback: just navigate to document
        navigate(`/${notification.documentId}`);
      }
    }
  };

  // Render the card content
  const cardContent = (
    <Card
      className={cn("p-4 transition-colors cursor-pointer hover:bg-accent", isUnread && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800")}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{title}</h4>
            {isUnread && <Badge variant="default" className="h-2 w-2 rounded-full p-0" />}
          </div>

          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{description}</p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{timeAgo}</span>
            {notification.actionStatus === "APPROVED" && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {notification.actionStatus === "REJECTED" && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Rejected
              </Badge>
            )}
            {isCanceled && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 mr-1" />
                Already handled
              </Badge>
            )}
          </div>

          {/* Show info message for canceled requests */}
          {isCanceled && <p className="text-xs text-muted-foreground mt-2 italic">This request was already processed by another administrator.</p>}

          {/* Action buttons for action-required notifications */}
          {isActionRequired && (
            <div className="flex gap-2 mt-3">
              {notification.actionType === "PERMISSION_REQUEST" ? (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("approve");
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("reject");
                    }}
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("accept");
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("decline");
                    }}
                  >
                    Decline
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <ViewportTracker notificationId={notification.id} isViewed={!isUnread} onMarkViewed={markAsViewed}>
      {cardContent}
    </ViewportTracker>
  );
}
