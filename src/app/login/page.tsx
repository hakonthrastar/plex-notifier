import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Plex Notifier</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Sign in with the email address you were invited with.
      </p>
      <Suspense>
        <LinkError searchParams={props.searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}

async function LinkError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="mb-4 rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      That sign-in link has expired or was already used. Request a new one below.
    </p>
  );
}
