---
"@idea/api": minor
"@idea/client": minor
"@idea/contracts": minor
---

Add advanced 7-level permission hierarchy

Implement sophisticated permission system with cascading inheritance:
- 7-level hierarchy (direct → group → subspace admin → subspace member → workspace admin → workspace member → guest)
- 5 permission levels (none, read, comment, edit, manage)
- Cascading inheritance from parent documents
- Per-document permission overrides
- Time-limited access for guests and group memberships
- Permission request and approval workflow
