// Milestone 1 spike: prove we can reach the shared Plex server and read its shows.
// Usage: npm run plex:check

import { connect, listShows, listSharedServers } from "../src/lib/plex.ts";

const token = process.env.PLEX_TOKEN;
if (!token) {
  console.error("PLEX_TOKEN is missing from .env.local");
  process.exit(1);
}

const servers = await listSharedServers(token);
console.log(`Found ${servers.length} shared server(s):`);
for (const s of servers) {
  console.log(`  - ${s.name}${s.owner ? ` (shared by ${s.owner})` : ""}`);
}

for (const s of servers) {
  console.log(`\nConnecting to ${s.name}...`);
  try {
    const server = await connect(s);
    console.log(`Connected via ${new URL(server.uri).host}`);
    const shows = await listShows(server);
    console.log(`${shows.length} shows:`);
    for (const show of shows) {
      console.log(`  ${show.title}${show.year ? ` (${show.year})` : ""}`);
    }
  } catch (err) {
    console.error(`  Failed: ${(err as Error).message}`);
  }
}
