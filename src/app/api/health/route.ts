import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

// Used by Docker's healthcheck: 200 when the app is up and can reach its database.
export async function GET() {
  await connection();
  try {
    await db.run(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
