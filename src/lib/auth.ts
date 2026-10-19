import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendLoginLink } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  plugins: [
    magicLink({
      expiresIn: 15 * 60,
      storeToken: "hashed",
      // Invite-only: unknown emails can't create an account by clicking a link...
      disableSignUp: true,
      async sendMagicLink({ email, url }) {
        // ...and Better Auth calls this for any email, so also refuse to send to
        // people who aren't invited. Otherwise anyone could use our domain to email
        // arbitrary addresses. The response is the same either way, so the login
        // form doesn't reveal who has an account.
        const invited = await db.query.user.findFirst({
          where: eq(schema.user.email, email.toLowerCase()),
        });
        if (!invited) return;
        if (process.env.NODE_ENV === "development") console.log(`Sign-in link for ${email}: ${url}`);
        await sendLoginLink(email, url);
      },
    }),
    nextCookies(), // must be last
  ],
});

/** The signed-in user, or a redirect to /login. Call inside a <Suspense> boundary. */
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user;
}
