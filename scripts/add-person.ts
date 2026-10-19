// Invites a person from the command line, e.g. to add the very first user.
// Usage: npm run people:add -- "Name" email@example.com

import { eq } from "drizzle-orm";
import { createDb } from "../src/db/client.ts";
import { user } from "../src/db/schema.ts";

const [name, rawEmail] = process.argv.slice(2);
if (!name || !rawEmail) {
  console.error('Usage: npm run people:add -- "Name" email@example.com');
  process.exit(1);
}
const email = rawEmail.trim().toLowerCase();

const db = createDb();
const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
if (existing) {
  console.log(`${email} is already invited.`);
} else {
  const now = new Date();
  await db.insert(user).values({ id: crypto.randomUUID(), name, email, emailVerified: false, createdAt: now, updatedAt: now });
  console.log(`Invited ${name} <${email}>. They can now sign in.`);
}
