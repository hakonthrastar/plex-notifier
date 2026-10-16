# vibecode-lab

A small full-stack Next.js app, built to practise AI-assisted development with professional habits.

## Stack
- Next.js (App Router, `src/app`), TypeScript, Tailwind CSS, ESLint
- Node 24 (see `.nvmrc`; run `nvm use` in this folder)

## Commands
- `npm run dev`: dev server at http://localhost:3000
- `npm run lint`: must pass before committing
- `npm run build`: must pass before committing

## Working rules
- Plan before building: for anything bigger than a small fix, agree on a plan first.
- Work in small steps: one feature or fix per branch, one logical change per commit.
- Verify every change: run lint and build, and check the page in the browser. Don't call something done until you've checked it.
- Never commit secrets. Keep them in `.env.local`, which git ignores.
- Explain non-obvious decisions in the commit message, not in long code comments.
