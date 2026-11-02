# plex-notifier

Plex Notifier: emails invited people when new episodes of shows they follow appear on a Plex server shared with us.
Built to practise AI-assisted development with professional habits.

## Stack
- Next.js 16 (App Router, `src/app`, Cache Components on), TypeScript, Tailwind CSS, ESLint
- SQLite via Drizzle ORM + libSQL (`src/db`), migrations in `drizzle/`
- Better Auth with invite-only magic-link login (`src/lib/auth.ts`), email via Resend
- Node 24 (see `.nvmrc`; run `nvm use` in this folder)

## Commands
- `npm run dev`: dev server at http://localhost:3000 (sign-in links are also printed to the console)
- `npm run lint`: must pass before committing
- `npm run build`: must pass before committing
- `npm run db:generate` after changing `src/db/schema.ts`, then `npm run db:migrate`
- `npm run people:add -- "Name" email`: invite someone from the command line
- `npm test`: unit tests (Vitest); must pass before committing
- `npm run check`: run one new-episode check and email the digests (exits non-zero if an email failed)
- `npm run worker`: run the check every `CHECK_INTERVAL_MINUTES` (what the `worker` container does)
- `npm run plex:check`: check the Plex connection

Settings live in `.env.local`; `.env.example` lists them.

## Deployment
Docker Compose on a Proxmox VM: `app` (plain HTTP on 3000) and `worker`, one image built and published
to GHCR by CI on merges to `main`. TLS is deliberately out of scope: the owner's own reverse proxy
terminates HTTPS, so don't add certificate handling to the app. Steps and updates: `docs/deploy.md`.
The app migrates on start, so schema changes need no manual steps. The build must not need real
secrets or a database.

## Conventions
- Pages read the DB and session inside `<Suspense>`; data isn't cached, actions call `refresh()`.
- Every server action calls `requireUser()` first: actions are reachable over plain HTTP.
- Scripts run by plain Node use `src/db/client.ts`; app code uses `@/db` (server-only).
- Decision logic stays pure and tested (`src/lib/new-episodes.ts`, `src/lib/digest.ts`); write the test first when changing a rule.
- Notifications flow: check → `deliveries` queue → one digest per person (`send-digests.ts`). A delivery is marked sent only after Resend accepts it; failures retry next run with the same idempotency key.
- Episodes are identified by show + season + number (`episodeKey`), not Plex's ratingKey, which changes on file upgrades.

## Working rules
- Plan before building: for anything bigger than a small fix, agree on a plan first.
- Work in small steps: one feature or fix per branch, one logical change per commit.
- Verify every change: run lint and build, and check the page in the browser. Don't call something done until you've checked it.
- Never commit secrets. Keep them in `.env.local`, which git ignores.
- Explain non-obvious decisions in the commit message, not in long code comments.
