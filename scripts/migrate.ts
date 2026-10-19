// Applies database migrations. Runs on every container start, so updates migrate themselves.
// Uses drizzle-orm's migrator rather than drizzle-kit, which is a dev-only tool.

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb } from "../src/db/client.ts";

const db = createDb();
// WAL lets the web app read while the worker writes. The setting is stored in the file.
await db.run(sql`PRAGMA journal_mode = WAL`);
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Database is up to date");
