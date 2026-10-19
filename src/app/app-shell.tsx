import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";

async function CurrentUser() {
  const me = await requireUser();
  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">{me.email}</span>
      <button className="rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800">Sign out</button>
    </form>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-4">
          <span className="font-semibold">Plex Notifier</span>
          <Link href="/" className="text-sm hover:underline">
            Shows
          </Link>
          <Link href="/people" className="text-sm hover:underline">
            People
          </Link>
        </nav>
        <Suspense>
          <CurrentUser />
        </Suspense>
      </header>
      <main>{children}</main>
    </div>
  );
}
