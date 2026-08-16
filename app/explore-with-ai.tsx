import { SITE_URL } from "@/lib/constants";
import NewWindowHint from "./new-window-hint";

// A small reading-assistance block: hands the current post's URL off to a
// chat tool with a pre-filled, open-ended prompt. No server call, no key —
// these are plain outbound links carrying the post URL as a query param.
//
// The ?q= handoff params are product affordances, not contractual APIs;
// if a provider changes theirs, the corresponding href here needs updating.
export default function ExploreWithAI({ slug }: { slug: string }) {
  const postUrl = `${SITE_URL}/posts/${slug}`;
  const prompt = `Read ${postUrl} and answer my questions about it.`;
  const q = encodeURIComponent(prompt);

  const targets = [
    { label: "Open in ChatGPT", href: `https://chatgpt.com/?q=${q}` },
    { label: "Open in Claude", href: `https://claude.ai/new?q=${q}` },
  ];

  return (
    <nav aria-label="Explore this post with AI" className="text-sm">
      {/* Matches the table-of-contents label exactly — same face, size and
          tracking. The two sit one above the other in the same sidebar, so any
          difference between them reads as an accident rather than a
          distinction. */}
      <p className="mb-3 font-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
        Explore with AI
      </p>
      {/* 15px, matching the table-of-contents item size directly above it. */}
      <ul className="space-y-2">
        {targets.map((t) => (
          <li key={t.href}>
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[15px] leading-[1.35] text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
            >
              {t.label}
              <NewWindowHint />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
