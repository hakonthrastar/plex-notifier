// One full run: detect new episodes, then email the digests. Used by `npm run check` and the worker.

import type { createDb } from "../db/client.ts";
import { runCheck } from "./check.ts";
import { sendEmail } from "./email.ts";
import { sendPendingDigests } from "./send-digests.ts";

export async function checkAndSend(db: ReturnType<typeof createDb>) {
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!appUrl) throw new Error("BETTER_AUTH_URL is not set (used for the link in digest emails)");

  const check = await runCheck(db);
  const send = await sendPendingDigests(db, sendEmail, appUrl);
  return { check, send };
}

export function describe({ check, send }: Awaited<ReturnType<typeof checkAndSend>>): string {
  const found = check.firstRun
    ? `${check.newEpisodes} recorded silently (first run)`
    : `${check.newEpisodes} new, ${check.queued} queued`;
  const failed = send.failed.map((f) => `; failed ${f.email}: ${f.error}`).join("");
  return `fetched ${check.fetched} episodes, ${found}, sent ${send.sent} digest(s)${failed}`;
}
