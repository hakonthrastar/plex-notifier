// Runs one new-episode check and emails the digests. Usage: npm run check
// Exits non-zero if any email failed, so a scheduler can flag it; failed ones retry next run.

import { createDb } from "../src/db/client.ts";
import { runCheck } from "../src/lib/check.ts";
import { sendEmail } from "../src/lib/email.ts";
import { sendPendingDigests } from "../src/lib/send-digests.ts";

const appUrl = process.env.BETTER_AUTH_URL;
if (!appUrl) {
  console.error("BETTER_AUTH_URL is not set (used for the link in digest emails)");
  process.exit(1);
}

const db = createDb();
const check = await runCheck(db);
console.log(
  `Fetched ${check.fetched} recent episodes, ${check.newEpisodes} new` +
    (check.firstRun ? " (first run: recorded silently, no notifications)" : `, ${check.queued} notifications queued`),
);

const result = await sendPendingDigests(db, sendEmail, appUrl);
console.log(`Sent ${result.sent} digest email(s)`);
for (const f of result.failed) console.error(`Failed to email ${f.email}: ${f.error} (will retry next run)`);
if (result.failed.length > 0) process.exitCode = 1;
