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
    <nav aria-label="Explore this post with AI" className="text-sm">
      {/* Must match the ToC label above it exactly. */}
      <p className="mb-3 font-ui text-xs font-bold uppercase tracking-widest text-brand-muted">
        Explore with AI
      </p>
      <ul className="space-y-2">
        {targets.map((t) => (
          <li key={t.href}>
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block leading-snug text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
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
