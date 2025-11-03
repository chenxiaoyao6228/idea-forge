---
"@idea/api": minor
"@idea/client": minor
"@idea/contracts": minor
---

Add smart notification system

Implement comprehensive notification system with intelligent filtering:
- Real-time delivery via WebSocket
- Multiple notification categories (mentions, comments, subscriptions, permission requests, join requests, invitations)
- Action-required special notifications with approval workflows
- Workspace and category-based filtering
- Batch operations (mark all as read, bulk view)
- Auto-mark as viewed after 2s in viewport
- Per-category notification preferences
- Per-workspace unread counters
- Notification cancellation to prevent duplicates
