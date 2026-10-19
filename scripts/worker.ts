// Long-running scheduler: runs the check every CHECK_INTERVAL_MINUTES (default 15).
// A failed run (Plex down, network blip) is logged and retried next time; the worker keeps going.

import { setTimeout as sleep } from "node:timers/promises";
import { createDb } from "../src/db/client.ts";
import { checkAndSend, describe } from "../src/lib/check-and-send.ts";

const minutes = Number(process.env.CHECK_INTERVAL_MINUTES ?? 15);
if (!Number.isFinite(minutes) || minutes < 1) {
  console.error(`CHECK_INTERVAL_MINUTES must be a number >= 1, got "${process.env.CHECK_INTERVAL_MINUTES}"`);
  process.exit(1);
}

const db = createDb();
const stop = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`${new Date().toISOString()} ${signal} received, stopping`);
    stop.abort();
  });
}

console.log(`${new Date().toISOString()} worker started, checking every ${minutes} min`);
while (!stop.signal.aborted) {
  const started = Date.now();
  try {
    const result = await checkAndSend(db);
    console.log(`${new Date().toISOString()} ${describe(result)} (${Date.now() - started} ms)`);
  } catch (err) {
    console.error(`${new Date().toISOString()} check failed: ${(err as Error).message}`);
  }
  await sleep(minutes * 60_000, undefined, { signal: stop.signal }).catch(() => {});
}
