# Isolated cloud backup lab

Open `cloud-backup-lab.html` over HTTPS. Enter the project's publishable key and two dedicated test account credentials directly on the page. Never use real Vita account data. No credentials are committed or persisted by the lab. Encryption uses a random in-memory password, so this fixture is intentionally not a recoverable personal backup.

The only database target is the existing `public.vita_encrypted_backups`. No schema changes. A random UUID is retained before INSERT so cleanup can target the exact attempted record even if the response is lost. The owner fetches/decrypts that ID; account B must see zero rows and delete zero rows; the owner then deletes the ID and confirms absence. Keep the displayed ID if cleanup fails. Closing the page or losing connectivity can interrupt cleanup; inspect only that ID using the owner account before retrying.

Automated check: `node cloud-backup-lab.test.mjs` (Node 22+). This tests Web Crypto and a simulated transport, including a lost INSERT response. It is not evidence of a live Supabase test.

2026-10-31: existing table inspected: empty; RLS enabled with owner-only SELECT, INSERT and DELETE policies. Crypto and simulated round trip passed locally.

Live browser evidence supplied by the user on 2026-10-31:
- Mac: screenshot at 23:01 Moscow time shows successful two-account login, crypto rejection checks, exact cloud round trip, account B unable to read/delete A's row, and confirmed cleanup. Test ID: `681da910-d5f7-44a3-aaf5-bcb201e35a20`.
- iPhone Safari: screenshot supplied at 23:26 (phone shows 23:25) shows the same successful stages and confirmed cleanup. Test ID: `1dadd730-5311-48e6-9021-8652d0d41e07`.

These are user-supplied browser results, not an independent database audit after those runs. No cross-device restore was tested: each run created and restored its own disposable fixture, with an in-memory random encryption password. Password recovery, interrupted real restore, offline behavior and conflict resolution are not validated by this lab.

Real sync remains disabled. Original index.html, existing storage keys and finance code are unchanged. Next design: [BACKUP-RESTORE-PLAN.md](BACKUP-RESTORE-PLAN.md).
