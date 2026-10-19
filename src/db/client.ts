// Database client without the server-only guard, so scripts run by plain Node can use it.
// App code should import from "@/db" instead.
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.ts";

export function createDb() {
  return drizzle({
    connection: { url: process.env.DATABASE_URL ?? "file:data/app.db" },
    schema,
  });
}
