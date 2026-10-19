import { describe, expect, it } from "vitest";
import { buildDigest } from "./digest.ts";
import type { Episode } from "./new-episodes.ts";

function ep(showTitle: string, season: number | null, episode: number | null, title = `Episode ${episode}`): Episode {
  return {
    ratingKey: `${showTitle}-${season}-${episode}`,
    showRatingKey: showTitle,
    showTitle,
    season,
    episode,
    title,
    addedAt: new Date("2026-10-19T12:00:00Z"),
  };
}

const appUrl = "https://plex.example.com";

describe("buildDigest", () => {
  it("names the episode in the subject when there is only one", () => {
    const d = buildDigest([ep("The Bear", 4, 3)], appUrl);
    expect(d.subject).toBe("New episode: The Bear S04E03");
  });

  it("counts episodes and names the shows when there are several", () => {
    const d = buildDigest([ep("The Bear", 4, 3), ep("The Bear", 4, 4), ep("Severance", 2, 1)], appUrl);
    expect(d.subject).toBe("3 new episodes: Severance, The Bear");
  });

  it("shortens the subject when many shows are included", () => {
    const shows = ["A", "B", "C", "D", "E"].map((s) => ep(s, 1, 1));
    expect(buildDigest(shows, appUrl).subject).toBe("5 new episodes: A, B, C and 2 more");
  });

  it("groups episodes by show, sorted by show title then season and episode", () => {
    const d = buildDigest([ep("The Bear", 4, 4), ep("Severance", 2, 1), ep("The Bear", 4, 3), ep("The Bear", 3, 10)], appUrl);
    const lines = d.text.split("\n").filter((l) => l.trim());
    expect(lines.slice(0, 6)).toEqual([
      "Severance",
      "  S02E01 · Episode 1",
      "The Bear",
      "  S03E10 · Episode 10",
      "  S04E03 · Episode 3",
      "  S04E04 · Episode 4",
    ]);
  });

  it("lists episodes without numbers by title", () => {
    const d = buildDigest([ep("Late Night", null, null, "October 19, 2026")], appUrl);
    expect(d.subject).toBe("New episode: Late Night – October 19, 2026");
    expect(d.text).toContain("  October 19, 2026");
  });

  it("escapes titles in the HTML version", () => {
    const d = buildDigest([ep("The Block", 22, 46, "Front Yard & Fascade <1>")], appUrl);
    expect(d.html).toContain("Front Yard &amp; Fascade &lt;1&gt;");
    expect(d.html).not.toContain("<1>");
    expect(d.text).toContain("Front Yard & Fascade <1>");
  });

  it("links to the app so people can change what they follow", () => {
    const d = buildDigest([ep("The Bear", 4, 3)], appUrl);
    expect(d.text).toContain(appUrl);
    expect(d.html).toContain(`href="${appUrl}"`);
  });
});
