// Runs one new-episode check and emails the digests. Usage: npm run check
// Exits non-zero if anything failed; failed emails retry on the next run.

import { createDb } from "../src/db/client.ts";
import { checkAndSend, describe } from "../src/lib/check-and-send.ts";

const result = await checkAndSend(createDb());
console.log(describe(result));
if (result.send.failed.length > 0) process.exitCode = 1;
