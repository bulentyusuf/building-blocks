import { SITE_URL } from "@/lib/constants";
import NewWindowHint from "./new-window-hint";

// Plain outbound links carrying the post URL. The ?q= params are product
// affordances, not contracts, so check them if a provider changes.
// German pages send the German URL and prompt; labels stay English chrome.
// [→ `locale`]
export default function ExploreWithAI({
  slug,
  german,
}: {
  slug: string;
  german: boolean;
}) {
  const postUrl = german
    ? `${SITE_URL}/de/posts/${slug}`
    : `${SITE_URL}/posts/${slug}`;
  const prompt = german
    ? `Lies ${postUrl} und beantworte meine Fragen dazu.`
    : `Read ${postUrl} and answer my questions about it.`;
  const q = encodeURIComponent(prompt);

  const targets = [
    { label: "Open in ChatGPT", href: `https://chatgpt.com/?q=${q}` },
    { label: "Open in Claude", href: `https://claude.ai/new?q=${q}` },
  ];

  return (
    // A sidebar box like the ToC above it, without the tape. [→ `post-page`]
    <nav
      aria-label="Explore this post with AI"
      className="rounded-[18px] border-[3px] border-brand-dark bg-card px-5.5 pt-5 pb-6"
    >
      <p className="mb-3 font-mono text-sm font-medium text-brand-muted">
        <span aria-hidden="true">{"// "}</span>
        explore with AI
      </p>
      <ul className="space-y-2.5 font-mono text-[0.8125rem]">
        {targets.map((t) => (
          <li key={t.href}>
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block leading-snug transition-colors duration-200 hover:text-brand-crimson"
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
