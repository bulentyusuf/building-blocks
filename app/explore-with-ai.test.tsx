import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExploreWithAI from "./explore-with-ai";
import { SITE_URL } from "@/lib/constants";

// Every outbound ?q= value, decoded.
const prompts = (html: string) =>
  [...html.matchAll(/\?q=([^"&]+)/g)].map((m) =>
    decodeURIComponent(m[1].replace(/&amp;/g, "&")),
  );

describe("ExploreWithAI", () => {
  it("sends the English URL and prompt from an English post", () => {
    const sent = prompts(
      renderToStaticMarkup(<ExploreWithAI slug="a-post" german={false} />),
    );
    // Non-vacuous: both providers must be found before their contents count.
    expect(sent).toHaveLength(2);
    for (const p of sent) {
      expect(p).toBe(
        `Read ${SITE_URL}/posts/a-post and answer my questions about it.`,
      );
    }
  });

  it("sends the German URL and prompt from a German post", () => {
    const html = renderToStaticMarkup(<ExploreWithAI slug="a-post" german />);
    const sent = prompts(html);
    expect(sent).toHaveLength(2);
    for (const p of sent) {
      expect(p).toBe(
        `Lies ${SITE_URL}/de/posts/a-post und beantworte meine Fragen dazu.`,
      );
    }
    // English chrome either way.
    expect(html).toContain("Open in Claude");
  });
});
