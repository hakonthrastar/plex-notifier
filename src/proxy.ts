import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Fast redirect for visitors with no session cookie. This only checks that a cookie
// exists, not that it's valid; pages and actions still verify with requireUser().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    // Behind a reverse proxy request.url is the internal address, so use the public one.
    return NextResponse.redirect(new URL("/login", process.env.BETTER_AUTH_URL ?? request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|api/health|_next|favicon.ico).*)"],
};
