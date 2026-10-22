---
"@reddb-io/ui": patch
---

Fix database sign-in from red:// and reds:// connection strings containing user:password. Decode inline credentials, exchange them for a session token, and keep credentials out of connection URLs and history.
