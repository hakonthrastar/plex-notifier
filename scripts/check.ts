// Runs one new-episode check by hand. Usage: npm run check

import { createDb } from "../src/db/client.ts";
import { runCheck } from "../src/lib/check.ts";

const result = await runCheck(createDb());
console.log(
  `Fetched ${result.fetched} recent episodes, ${result.newEpisodes} new` +
    (result.firstRun ? " (first run: recorded silently, no notifications)" : `, ${result.queued} notifications queued`),
);
