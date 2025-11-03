---
"@idea/api": minor
"@idea/client": minor
"@idea/contracts": minor
---

Add document subscription system

Allow users to follow documents and subspaces for updates:
- Subscribe to specific documents or entire subspaces
- Get notified when subscribed documents are published
- View all active subscriptions in one place
- Unsubscribe with soft delete
- Smart duplicate prevention (don't notify if user already viewed)
- Only notify on document publish, not every edit
- Respect user notification preferences
