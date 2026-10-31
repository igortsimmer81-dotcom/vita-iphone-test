# Isolated cloud backup lab

Open `cloud-backup-lab.html` over HTTPS. Enter the project's publishable key and two dedicated test account credentials directly on the page. Never use real Vita account data. No credentials are committed or persisted by the lab. Encryption uses a random in-memory password, so this fixture is intentionally not a recoverable personal backup.

The only database target is the existing `public.vita_encrypted_backups`. No schema changes. A random UUID is retained before INSERT so cleanup can target the exact attempted record even if the response is lost. The owner fetches/decrypts that ID; account B must see zero rows and delete zero rows; the owner then deletes the ID and confirms absence. Keep the displayed ID if cleanup fails. Closing the page or losing connectivity can interrupt cleanup; inspect only that ID using the owner account before retrying.

Automated check: `node cloud-backup-lab.test.mjs` (Node 22+). This tests Web Crypto and a simulated transport, including a lost INSERT response. It is not evidence of a live Supabase test.

2026-10-31: existing table inspected: empty; RLS enabled with owner-only SELECT, INSERT and DELETE policies. Crypto and simulated round trip passed locally. Live login, live round trip, live RLS and Mac/iPhone browser checks remain pending until dedicated test credentials are available. Real sync remains disabled. Original index.html, existing storage keys and finance code are unchanged.
