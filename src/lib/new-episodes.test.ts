import { describe, expect, it } from "vitest";
import { episodeKey, planNotifications, toEpisode, type Episode } from "./new-episodes.ts";

let nextRatingKey = 1000;
function ep(show: string, season: number | null, episode: number | null, overrides: Partial<Episode> = {}): Episode {
  return {
    ratingKey: String(nextRatingKey++),
    showRatingKey: show,
    showTitle: `Show ${show}`,
    season,
    episode,
    title: `Episode ${episode}`,
    addedAt: new Date("2026-10-19T12:00:00Z"),
    ...overrides,
  };
}

const followers = (entries: Record<string, string[]>) => new Map(Object.entries(entries));

describe("episodeKey", () => {
  it("identifies an episode by show, season and number", () => {
    expect(episodeKey(ep("42", 2, 5))).toBe("42:S2E5");
  });

  it("falls back to the Plex ratingKey when numbers are missing", () => {
    expect(episodeKey(ep("42", null, null, { ratingKey: "777" }))).toBe("rk:777");
  });
});

describe("planNotifications", () => {
  it("records everything but notifies nobody on the first run", () => {
    const fetched = [ep("1", 1, 1), ep("1", 1, 2)];
    const plan = planNotifications({ fetched, seenKeys: new Set(), followersByShow: followers({ "1": ["alice"] }), firstRun: true });

    expect(plan.toRecord).toHaveLength(2);
    expect(plan.deliveries).toEqual([]);
  });

  it("ignores episodes it has already seen", () => {
    const old = ep("1", 1, 1);
    const plan = planNotifications({
      fetched: [old],
      seenKeys: new Set([episodeKey(old)]),
      followersByShow: followers({ "1": ["alice"] }),
      firstRun: false,
    });

    expect(plan.toRecord).toEqual([]);
    expect(plan.deliveries).toEqual([]);
  });

  it("notifies every follower of a show about its new episode", () => {
    const fresh = ep("1", 1, 3);
    const plan = planNotifications({
      fetched: [fresh],
      seenKeys: new Set(),
      followersByShow: followers({ "1": ["alice", "bob"] }),
      firstRun: false,
    });

    expect(plan.deliveries).toEqual([
      { userId: "alice", episode: fresh },
      { userId: "bob", episode: fresh },
    ]);
  });

  it("records new episodes of unfollowed shows without notifying anyone", () => {
    const plan = planNotifications({
      fetched: [ep("2", 1, 1)],
      seenKeys: new Set(),
      followersByShow: followers({ "1": ["alice"] }),
      firstRun: false,
    });

    expect(plan.toRecord).toHaveLength(1);
    expect(plan.deliveries).toEqual([]);
  });

  it("counts an episode listed twice in one fetch only once", () => {
    const a = ep("1", 1, 4);
    const plan = planNotifications({
      fetched: [a, { ...a }],
      seenKeys: new Set(),
      followersByShow: followers({ "1": ["alice"] }),
      firstRun: false,
    });

    expect(plan.toRecord).toHaveLength(1);
    expect(plan.deliveries).toHaveLength(1);
  });

  it("does not re-notify when an episode is re-added with a new ratingKey (e.g. a quality upgrade)", () => {
    const original = ep("1", 1, 5, { ratingKey: "500" });
    const upgraded = ep("1", 1, 5, { ratingKey: "501" });
    const plan = planNotifications({
      fetched: [upgraded],
      seenKeys: new Set([episodeKey(original)]),
      followersByShow: followers({ "1": ["alice"] }),
      firstRun: false,
    });

    expect(plan.deliveries).toEqual([]);
  });

  it("notifies about every episode when a whole season arrives at once", () => {
    const season = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ep("1", 3, n));
    const plan = planNotifications({
      fetched: season,
      seenKeys: new Set(),
      followersByShow: followers({ "1": ["alice"] }),
      firstRun: false,
    });

    expect(plan.deliveries).toHaveLength(8);
  });
});

describe("toEpisode", () => {
  it("maps Plex episode metadata", () => {
    const e = toEpisode({
      ratingKey: "392331",
      grandparentRatingKey: "392305",
      grandparentTitle: "Berserk",
      parentIndex: 1,
      index: 24,
      title: "The Great Eclipse",
      addedAt: 1785685065,
    });

    expect(e).toEqual({
      ratingKey: "392331",
      showRatingKey: "392305",
      showTitle: "Berserk",
      season: 1,
      episode: 24,
      title: "The Great Eclipse",
      addedAt: new Date(1785685065 * 1000),
    });
  });

  it("keeps episodes that have no season or episode number", () => {
    const e = toEpisode({ ratingKey: "9", grandparentRatingKey: "8", grandparentTitle: "Talk", title: "Oct 19", addedAt: 1 });
    expect(e.season).toBeNull();
    expect(e.episode).toBeNull();
  });
});
