// Minimal client for the Plex APIs this app needs.
// plex.tv tells us which servers are shared with us; each server is then queried directly.

import type { PlexEpisodeMetadata } from "./new-episodes.ts";

const PLEX_TV = "https://plex.tv";
const CONNECT_TIMEOUT_MS = 5000;

type Connection = {
  uri: string;
  local: boolean;
  relay: boolean;
};

type Resource = {
  name: string;
  provides: string;
  owned: boolean;
  sourceTitle?: string;
  clientIdentifier: string;
  accessToken?: string;
  connections: Connection[];
};

export type PlexServer = {
  name: string;
  owner?: string;
  id: string;
  accessToken: string;
  connections: Connection[];
};

export type ConnectedServer = PlexServer & { uri: string };

export type Show = {
  ratingKey: string;
  title: string;
  year?: number;
};

function headers(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "X-Plex-Token": token,
    "X-Plex-Product": "vibecode-lab",
    "X-Plex-Client-Identifier": "vibecode-lab-plex-notifier",
  };
}

async function getJson<T>(url: string, token: string, timeoutMs = 15000): Promise<T> {
  const res = await fetch(url, {
    headers: headers(token),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${new URL(url).pathname}`);
  }
  return res.json() as Promise<T>;
}

/** Servers other people have shared with the account that owns `accountToken`. */
export async function listSharedServers(accountToken: string): Promise<PlexServer[]> {
  const resources = await getJson<Resource[]>(
    `${PLEX_TV}/api/v2/resources?includeHttps=1&includeRelay=1`,
    accountToken,
  );
  return resources
    .filter((r) => r.provides.split(",").includes("server") && !r.owned && r.accessToken)
    .map((r) => ({
      name: r.name,
      owner: r.sourceTitle,
      id: r.clientIdentifier,
      accessToken: r.accessToken!,
      connections: r.connections,
    }));
}

/**
 * Returns the server with the first connection that answers.
 * A shared server's LAN addresses are unreachable from here, so remote
 * direct connections go first and Plex's relay is the last resort.
 */
export async function connect(server: PlexServer): Promise<ConnectedServer> {
  const ordered = [
    ...server.connections.filter((c) => !c.local && !c.relay),
    ...server.connections.filter((c) => c.local),
    ...server.connections.filter((c) => c.relay),
  ];
  for (const c of ordered) {
    try {
      await getJson(`${c.uri}/identity`, server.accessToken, CONNECT_TIMEOUT_MS);
      return { ...server, uri: c.uri };
    } catch {
      // Try the next connection.
    }
  }
  throw new Error(`Could not reach server "${server.name}" on any of its ${ordered.length} connections`);
}

/**
 * Connects to the shared server named by PLEX_SERVER_NAME, or the first one shared
 * with the account if that isn't set.
 */
export async function connectToSharedServer(accountToken: string, name?: string): Promise<ConnectedServer> {
  const servers = await listSharedServers(accountToken);
  const match = name ? servers.find((s) => s.name === name) : servers[0];
  if (!match) throw new Error(name ? `No shared server named "${name}"` : "No shared Plex servers found");
  return connect(match);
}

type Container<T> = { MediaContainer: T };

async function listShowSections(server: ConnectedServer) {
  const { MediaContainer } = await getJson<Container<{ Directory?: { key: string; type: string }[] }>>(
    `${server.uri}/library/sections`,
    server.accessToken,
  );
  return (MediaContainer.Directory ?? []).filter((d) => d.type === "show");
}

/** The most recently added episodes in each TV section, newest first. */
export async function listRecentEpisodes(server: ConnectedServer, perSection = 100): Promise<PlexEpisodeMetadata[]> {
  const episodes: PlexEpisodeMetadata[] = [];
  for (const section of await listShowSections(server)) {
    const { MediaContainer } = await getJson<Container<{ Metadata?: PlexEpisodeMetadata[] }>>(
      `${server.uri}/library/sections/${section.key}/all?type=4&sort=addedAt:desc` +
        `&X-Plex-Container-Start=0&X-Plex-Container-Size=${perSection}`,
      server.accessToken,
    );
    episodes.push(...(MediaContainer.Metadata ?? []));
  }
  return episodes;
}

export async function listShows(server: ConnectedServer): Promise<Show[]> {
  const showSections = await listShowSections(server);

  const shows: Show[] = [];
  for (const section of showSections) {
    const { MediaContainer } = await getJson<Container<{ Metadata?: Show[] }>>(
      `${server.uri}/library/sections/${section.key}/all?type=2`,
      server.accessToken,
    );
    for (const s of MediaContainer.Metadata ?? []) {
      shows.push({ ratingKey: s.ratingKey, title: s.title, year: s.year });
    }
  }
  return shows.sort((a, b) => a.title.localeCompare(b.title));
}
