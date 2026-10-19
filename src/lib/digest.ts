// Builds the digest email for one person. Pure, covered by digest.test.ts.

import type { Episode } from "./new-episodes.ts";

export type Digest = { subject: string; text: string; html: string };

const pad = (n: number) => String(n).padStart(2, "0");

function code(e: Episode): string | null {
  return e.season != null && e.episode != null ? `S${pad(e.season)}E${pad(e.episode)}` : null;
}

function label(e: Episode): string {
  const c = code(e);
  return c ? `${c} · ${e.title}` : e.title;
}

function compare(a: Episode, b: Episode): number {
  return (
    a.showTitle.localeCompare(b.showTitle) ||
    (a.season ?? Infinity) - (b.season ?? Infinity) ||
    (a.episode ?? Infinity) - (b.episode ?? Infinity) ||
    a.title.localeCompare(b.title)
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function subjectFor(episodes: Episode[], shows: string[]): string {
  if (episodes.length === 1) {
    const [e] = episodes;
    const c = code(e);
    return `New episode: ${e.showTitle} ${c ?? `– ${e.title}`}`;
  }
  const named = shows.length > 3 ? `${shows.slice(0, 3).join(", ")} and ${shows.length - 3} more` : shows.join(", ");
  return `${episodes.length} new episodes: ${named}`;
}

export function buildDigest(episodes: Episode[], appUrl: string): Digest {
  const sorted = [...episodes].sort(compare);
  const byShow = new Map<string, Episode[]>();
  for (const e of sorted) byShow.set(e.showTitle, [...(byShow.get(e.showTitle) ?? []), e]);
  const shows = [...byShow.keys()];

  const text = [
    ...[...byShow].map(([show, eps]) => [show, ...eps.map((e) => `  ${label(e)}`)].join("\n")),
    `Change the shows you follow: ${appUrl}`,
  ].join("\n\n");

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b">
${[...byShow]
  .map(
    ([show, eps]) => `<h3 style="margin:16px 0 4px">${escapeHtml(show)}</h3>
<ul style="margin:0;padding-left:20px">
${eps.map((e) => `  <li>${escapeHtml(label(e))}</li>`).join("\n")}
</ul>`,
  )
  .join("\n")}
<p style="margin-top:24px;color:#71717a;font-size:13px"><a href="${escapeHtml(appUrl)}">Change the shows you follow</a></p>
</div>`;

  return { subject: subjectFor(sorted, shows), text, html };
}
