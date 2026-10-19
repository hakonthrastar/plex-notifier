// Database client without the server-only guard, so scripts run by plain Node can use it.
// App code should import from "@/db" instead.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.ts";

export function createDb(url = process.env.DATABASE_URL ?? "file:data/app.db") {
  // SQLite won't create missing folders, and libSQL opens the file as soon as the client exists.
  if (url.startsWith("file:")) mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  return drizzle({
    // The web app and the worker write to the same file; wait for a lock instead of failing.
    connection: { url, timeout: 5000 },
    schema,
  });
}
