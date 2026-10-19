// Decides which episodes are new and who to tell. Pure: no database or network,
// so every rule here is covered by new-episodes.test.ts.

export type Episode = {
  ratingKey: string;
  showRatingKey: string;
  showTitle: string;
  season: number | null;
  episode: number | null;
  title: string;
  addedAt: Date;
};

export type Delivery = { userId: string; episode: Episode };

/**
 * Stable identity for an episode. Plex can give an episode a new ratingKey when
 * the file is replaced (e.g. a quality upgrade), so we key on show + season +
 * number and only fall back to the ratingKey when the numbers are missing.
 */
export function episodeKey(e: Episode): string {
  return e.season != null && e.episode != null ? `${e.showRatingKey}:S${e.season}E${e.episode}` : `rk:${e.ratingKey}`;
}

export function planNotifications(input: {
  fetched: Episode[];
  seenKeys: Set<string>;
  followersByShow: Map<string, string[]>;
  /** True when nothing has been recorded yet; we then record the backlog silently. */
  firstRun: boolean;
}): { toRecord: Episode[]; deliveries: Delivery[] } {
  const keys = new Set(input.seenKeys);
  const toRecord: Episode[] = [];
  for (const e of input.fetched) {
    const key = episodeKey(e);
    if (keys.has(key)) continue;
    keys.add(key);
    toRecord.push(e);
  }

  if (input.firstRun) return { toRecord, deliveries: [] };

  const deliveries = toRecord.flatMap((episode) =>
    (input.followersByShow.get(episode.showRatingKey) ?? []).map((userId) => ({ userId, episode })),
  );
  return { toRecord, deliveries };
}

export type PlexEpisodeMetadata = {
  ratingKey: string;
  grandparentRatingKey: string;
  grandparentTitle: string;
  parentIndex?: number;
  index?: number;
  title: string;
  addedAt: number;
};

export function toEpisode(m: PlexEpisodeMetadata): Episode {
  return {
    ratingKey: m.ratingKey,
    showRatingKey: m.grandparentRatingKey,
    showTitle: m.grandparentTitle,
    season: m.parentIndex ?? null,
    episode: m.index ?? null,
    title: m.title,
    addedAt: new Date(m.addedAt * 1000),
  };
}
