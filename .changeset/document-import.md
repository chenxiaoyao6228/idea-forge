---
"@idea/api": minor
"@idea/client": minor
"@idea/contracts": minor
---

Add document import system

Enable seamless content migration with background processing:
- 3-step import workflow (prepare, upload to S3, process)
- Markdown file import (.md, .markdown)
- Drag-and-drop file upload
- Background processing with BullMQ
- Job status tracking (pending, processing, complete, error)
- Choose target workspace, subspace, and parent document
- Temporary import records with auto-cleanup after 24 hours
- Support for bulk document migration
