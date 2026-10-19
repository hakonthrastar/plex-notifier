// Used by the app and by plain-Node scripts (the scheduled check), so no server-only guard.
// The API key only exists in server-side env, so a client import couldn't send anyway.
import { Resend } from "resend";

export type EmailMessage = { subject: string; text: string; html: string };

let resend: Resend | undefined;

export async function sendEmail(to: string, message: EmailMessage, options: { idempotencyKey?: string } = {}) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");
  resend ??= new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({ from, to, ...message }, options);
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendLoginLink(to: string, url: string) {
  await sendEmail(to, {
    subject: "Your sign-in link",
    text: `Sign in to Plex Notifier:\n\n${url}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
    html: `<p>Sign in to Plex Notifier:</p>
<p><a href="${url}">Sign in</a></p>
<p style="color:#666">The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</p>`,
  });
}
