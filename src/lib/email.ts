import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, text: string, html: string) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");

  const { error } = await resend.emails.send({ from, to, subject, text, html });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendLoginLink(to: string, url: string) {
  await sendEmail(
    to,
    "Your sign-in link",
    `Sign in to Plex Notifier:\n\n${url}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
    `<p>Sign in to Plex Notifier:</p>
<p><a href="${url}">Sign in</a></p>
<p style="color:#666">The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</p>`,
  );
}
