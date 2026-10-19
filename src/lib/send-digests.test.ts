import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db/client.ts";
import { deliveries, seenEpisodes, user } from "../db/schema.ts";
import type { EmailMessage } from "./email.ts";
import { sendPendingDigests } from "./send-digests.ts";

// Runs against a real SQLite file with the real migrations, so the queries are tested too.
let dir: string;
let db: ReturnType<typeof createDb>;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "send-digests-"));
  db = createDb(`file:${join(dir, "test.db")}`);
  await migrate(db, { migrationsFolder: "drizzle" });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const now = new Date("2026-10-19T12:00:00Z");

async function addUser(id: string) {
  await db.insert(user).values({ id, name: id, email: `${id}@example.com`, emailVerified: false, createdAt: now, updatedAt: now });
}

async function addEpisode(key: string, showTitle: string, season: number, episode: number) {
  await db.insert(seenEpisodes).values({
    key,
    ratingKey: key,
    showRatingKey: showTitle,
    showTitle,
    season,
    episode,
    title: `Episode ${episode}`,
    addedAt: now,
    seenAt: now,
  });
}

async function queue(userId: string, episodeKey: string) {
  await db.insert(deliveries).values({ userId, episodeKey, createdAt: now });
}

type Sent = { to: string; message: EmailMessage; idempotencyKey?: string };
function recorder(failFor: string[] = []) {
  const sent: Sent[] = [];
  const send = async (to: string, message: EmailMessage, opts: { idempotencyKey?: string }) => {
    if (failFor.includes(to)) throw new Error("mailbox on fire");
    sent.push({ to, message, idempotencyKey: opts.idempotencyKey });
  };
  return { sent, send };
}

describe("sendPendingDigests", () => {
  beforeEach(async () => {
    await addUser("alice");
    await addUser("bob");
    await addEpisode("bear:S4E3", "The Bear", 4, 3);
    await addEpisode("bear:S4E4", "The Bear", 4, 4);
    await addEpisode("sev:S2E1", "Severance", 2, 1);
  });

  it("sends each person one digest with all their pending episodes and marks them sent", async () => {
    await queue("alice", "bear:S4E3");
    await queue("alice", "bear:S4E4");
    await queue("bob", "sev:S2E1");
    const { sent, send } = recorder();

    const result = await sendPendingDigests(db, send, "https://app");

    expect(result).toEqual({ sent: 2, failed: [] });
    expect(sent.map((s) => [s.to, s.message.subject]).sort()).toEqual([
      ["alice@example.com", "2 new episodes: The Bear"],
      ["bob@example.com", "New episode: Severance S02E01"],
    ]);
    expect(await db.select().from(deliveries).where(isNull(deliveries.sentAt))).toEqual([]);
  });

  it("does not send the same episodes twice", async () => {
    await queue("alice", "bear:S4E3");
    const { sent, send } = recorder();

    await sendPendingDigests(db, send, "https://app");
    const second = await sendPendingDigests(db, send, "https://app");

    expect(second).toEqual({ sent: 0, failed: [] });
    expect(sent).toHaveLength(1);
  });

  it("keeps a failed person's episodes queued without blocking anyone else", async () => {
    await queue("alice", "bear:S4E3");
    await queue("bob", "sev:S2E1");
    const { sent, send } = recorder(["alice@example.com"]);

    const result = await sendPendingDigests(db, send, "https://app");

    expect(result.sent).toBe(1);
    expect(result.failed).toEqual([{ email: "alice@example.com", error: "mailbox on fire" }]);
    expect(sent.map((s) => s.to)).toEqual(["bob@example.com"]);
    const pending = await db.select().from(deliveries).where(isNull(deliveries.sentAt));
    expect(pending.map((d) => d.userId)).toEqual(["alice"]);
  });

  it("retries a failed digest with the same idempotency key, so a send that did go through isn't repeated", async () => {
    await queue("alice", "bear:S4E3");
    const keys: (string | undefined)[] = [];
    const failing = async (_to: string, _m: EmailMessage, o: { idempotencyKey?: string }) => {
      keys.push(o.idempotencyKey);
      throw new Error("timeout");
    };
    const working = async (_to: string, _m: EmailMessage, o: { idempotencyKey?: string }) => {
      keys.push(o.idempotencyKey);
    };

    await sendPendingDigests(db, failing, "https://app");
    await sendPendingDigests(db, working, "https://app");

    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });
});
