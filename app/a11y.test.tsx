/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderToReadableStream } from "react-dom/server";
import axe from "axe-core";
import type { AxeResults, Result } from "axe-core";
import { getByRole, queryByRole } from "@testing-library/dom";
import fs from "node:fs";
import path from "node:path";
import { SITE_TITLE } from "@/lib/constants";
import type { CardPost, Content } from "@/lib/types";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import type { Document } from "@contentful/rich-text-types";

// Accessibility regression suite.
//
// This exists because the defects it guards were all found by running axe once,
// by hand, against markup rendered outside the test suite — and the run was
// then thrown away, so nothing stopped them coming back. Every rule below has
// caught a real defect in this repo: heading-order caught the footer's <h4>
// column labels skipping a level after the page's h2s, and the duplicate-link
// check (which axe does NOT implement) caught every listing card exposing its
// cover and its title as two links to one post with one name.
//
// Pages are composed from the real components inside the real RootLayout, so
// the header, footer, skip link and landmark structure are the shipped ones
// rather than a fixture approximating them. RootLayout is an async server
// component and CoverImage is another nested inside it, which is why this uses
// renderToReadableStream: renderToStaticMarkup cannot resolve either.

vi.mock("server-only", () => ({}));
// next/font/google reaches the network at module scope. The layout only uses
// the returned `variable`, so a stub is faithful enough for structure.
vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-bricolage" }),
  Literata: () => ({ variable: "--font-literata" }),
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));
// The blur fetch would hit Contentful. undefined is the component's real
// "no LQIP underlay" branch, so this exercises a shipped path.
vi.mock("@/lib/blur", () => ({ getBlurDataURL: async () => undefined }));

const RootLayout = (await import("@/app/layout")).default;
const MoreStories = (await import("@/app/more-stories")).default;
const Breadcrumb = (await import("@/app/breadcrumb")).default;
const ListingPage = (await import("@/app/listing-page")).default;
const WidePage = (await import("@/app/wide-page")).default;
const Pagination = (await import("@/app/pagination")).default;
const CoverImage = (await import("@/app/cover-image")).default;
const Avatar = (await import("@/app/avatar")).default;
const { RichText } = await import("@/lib/rich-text");
const { extractHeadings } = await import("@/lib/headings");

/**
 * Rules that cannot be evaluated here, and where they are covered instead.
 *
 * Both need a layout engine, which jsdom has no part of — it computes no boxes
 * and applies no Tailwind stylesheet, so axe would either error or report a
 * false pass. Contrast is asserted numerically against the tokens themselves in
 * lib/tag-pill.test.ts, which is the more precise test anyway: it reads the
 * values out of globals.css rather than sampling rendered pixels.
 */
const LAYOUT_DEPENDENT_RULES = {
  "color-contrast": { enabled: false },
  "target-size": { enabled: false },
} as const;

function formatViolations(violations: Result[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 3)
        .map((n) => `      ${n.html.slice(0, 160).replace(/\s+/g, " ")}`)
        .join("\n");
      const more =
        v.nodes.length > 3 ? `\n      …and ${v.nodes.length - 3} more` : "";
      return `  [${v.impact}] ${v.id} — ${v.help}\n${nodes}${more}\n      ${v.helpUrl}`;
    })
    .join("\n\n");
}

/** Render a page into the document, then hand it to axe. */
async function renderPage(page: React.ReactElement): Promise<AxeResults> {
  const stream = await renderToReadableStream(page);
  await stream.allReady;
  const html = await new Response(stream).text();
  // RootLayout emits a full document; jsdom already has html/head/body, so the
  // body's contents are transplanted rather than the whole string parsed.
  document.body.innerHTML = html
    .replace(/^[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "");
  return axe.run(document.body, {
    resultTypes: ["violations"],
    rules: LAYOUT_DEPENDENT_RULES,
  });
}

function expectNoViolations(results: AxeResults) {
  if (results.violations.length > 0) {
    throw new Error(
      `axe found ${results.violations.length} violation(s):\n\n${formatViolations(results.violations)}`,
    );
  }
}

/**
 * Links inside <main> that share a destination AND an accessible name.
 *
 * axe does not flag this — both links are perfectly labelled, which is the
 * problem: they are the same label twice. It doubles the tab stops on a
 * listing and fills a screen reader's link list with pairs that cannot be told
 * apart. A cover image linking to the post its title also links to is the
 * shape this catches.
 *
 * Scoped to <main> deliberately. The header and footer both link to
 * /categories with the name "Categories", and that is ordinary site chrome,
 * not a defect — the landmarks distinguish them.
 */
function duplicateLinksInMain(): string[] {
  const main = document.querySelector("main");
  if (!main) throw new Error("no <main> landmark rendered");

  const seen = new Map<string, number>();
  for (const link of main.querySelectorAll("a[href]")) {
    // A link hidden from assistive tech is not announced, so it cannot
    // duplicate an announcement. That is exactly how the cover link opts out.
    if (link.closest('[aria-hidden="true"]')) continue;

    const labelledBy = link.getAttribute("aria-labelledby");
    const name = (
      link.getAttribute("aria-label") ??
      (labelledBy
        ? (document.getElementById(labelledBy)?.textContent ?? "")
        : (link.textContent ?? ""))
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;

    const key = `${link.getAttribute("href")} :: ${name}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, n]) => n > 1)
    .map(([key, n]) => `${key} (×${n})`);
}

function post(slug: string, tags: string[] = []): CardPost {
  return {
    slug,
    title: `Post ${slug}`,
    date: "2026-01-01",
    excerpt: `Excerpt for post ${slug}.`,
    coverImage: { url: "https://images.ctfassets.net/x/y/cover.jpg" },
    tagsCollection: {
      items: tags.map((t) => ({ name: t, slug: t.toLowerCase() })),
    },
  };
}

// A body exercising every embedded type: a figure with a caption, a code
// block, a prompt block and an inline sidenote. Each has its own naming rules.
const text = (value: string) => ({
  nodeType: "text",
  value,
  marks: [],
  data: {},
});
const para = (...content: unknown[]) => ({
  nodeType: BLOCKS.PARAGRAPH,
  data: {},
  content,
});
const h2 = (value: string) => ({
  nodeType: BLOCKS.HEADING_2,
  data: {},
  content: [text(value)],
});
const embed = (nodeType: string, id: string) => ({
  nodeType,
  data: { target: { sys: { id } } },
  content: [],
});
const cell = (nodeType: string, value: string) => ({
  nodeType,
  data: {},
  content: [para(text(value))],
});
const row = (...cells: unknown[]) => ({
  nodeType: BLOCKS.TABLE_ROW,
  data: {},
  content: cells,
});
const table = (...rows: unknown[]) => ({
  nodeType: BLOCKS.TABLE,
  data: {},
  content: rows,
});

// Three columns, one of them ("Updated") mixing digits and text, exercising
// a table with a header row and more than one body row.
const bodyTable = table(
  row(
    cell(BLOCKS.TABLE_HEADER_CELL, "Category"),
    cell(BLOCKS.TABLE_HEADER_CELL, "Posts"),
    cell(BLOCKS.TABLE_HEADER_CELL, "Updated"),
  ),
  row(
    cell(BLOCKS.TABLE_CELL, "Design"),
    cell(BLOCKS.TABLE_CELL, "12"),
    cell(BLOCKS.TABLE_CELL, "3"),
  ),
  row(
    cell(BLOCKS.TABLE_CELL, "Retro"),
    cell(BLOCKS.TABLE_CELL, "4"),
    cell(BLOCKS.TABLE_CELL, "TBD"),
  ),
);

const bodyDoc = {
  nodeType: BLOCKS.DOCUMENT,
  data: {},
  content: [
    h2("First section"),
    para(
      text("Body copy carrying a note"),
      embed(INLINES.EMBEDDED_ENTRY, "n1"),
    ),
    embed(BLOCKS.EMBEDDED_ASSET, "img1"),
    embed(BLOCKS.EMBEDDED_ENTRY, "code1"),
    embed(BLOCKS.EMBEDDED_ENTRY, "prompt1"),
    bodyTable,
    h2("Second section"),
    para(text("Closing copy.")),
  ],
} as unknown as Document;

const bodyContent = {
  json: bodyDoc,
  links: {
    assets: {
      block: [
        {
          sys: { id: "img1" },
          url: "https://images.ctfassets.net/x/y/photo.jpg",
          title: "Three vintage beige computers stacked in a glass cabinet",
          description: "A cabinet of vintage computers stacked three high",
        },
      ],
    },
    entries: {
      block: [
        {
          sys: { id: "code1" },
          __typename: "CodeBlock",
          filename: "example.ts",
          code: "const a = 1;",
        },
        {
          sys: { id: "prompt1" },
          __typename: "PromptBlock",
          label: "A prompt",
          prompt: "Draw a cat",
        },
      ],
      inline: [
        {
          sys: { id: "n1" },
          __typename: "Sidenote",
          note: {
            json: {
              nodeType: BLOCKS.DOCUMENT,
              data: {},
              content: [para(text("The note body."))],
            },
          },
        },
      ],
    },
  },
} as unknown as Content;

describe("listing page", () => {
  const render = () =>
    renderPage(
      <RootLayout>
        <div className="mx-auto max-w-5xl px-5 py-8">
          <section className="mb-16">
            <h1>
              <a href="/posts/hero">The hero post</a>
            </h1>
            <CoverImage
              url="https://images.ctfassets.net/x/y/hero.jpg"
              slug="hero"
              wide
              priority
            />
          </section>
          <MoreStories
            morePosts={[post("a", ["Design"]), post("b", ["Retro", "Code"])]}
            heading="Latest Posts"
            visibleTags={new Set(["design", "retro", "code"])}
          />
          <Pagination currentPage={2} totalPages={5} basePath="/" />
        </div>
      </RootLayout>,
    );

  it("has no axe violations", async () => {
    expectNoViolations(await render());
  });

  it("announces each post exactly once", async () => {
    // The cover and the title both link to the post. The cover opts out of the
    // accessibility tree so only the title is announced; drop that and every
    // card here doubles.
    await render();
    expect(duplicateLinksInMain()).toEqual([]);
  });

  it("keeps heading levels contiguous", async () => {
    // The footer's column labels are <p> for this reason: as <h4> they landed
    // after the page's h2 and skipped h3.
    await render();
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});

describe("banded listing page", () => {
  // One of the ten browsing routes, rendered through the real shared shell so
  // the band, its breadcrumb and the listing under it are the shipped ones.
  // Structural only: the band's whole point is a colour change, and this suite
  // disables axe's color-contrast rule because jsdom computes no boxes. The
  // numeric guard for the band lives in lib/palette-contrast.test.ts.
  const render = () =>
    renderPage(
      <RootLayout>
        <ListingPage
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: "Design" },
          ]}
          posts={[post("a", ["Design"]), post("b", ["Retro"])]}
          currentPage={1}
          totalPages={2}
          visibleTags={new Set(["design", "retro"])}
          basePath="/categories/design"
        >
          <h1>Design</h1>
          <p>Posts filed under Design.</p>
        </ListingPage>
      </RootLayout>,
    );

  it("has no axe violations", async () => {
    expectNoViolations(await render());
  });

  it("announces each post exactly once", async () => {
    await render();
    expect(duplicateLinksInMain()).toEqual([]);
  });

  it("keeps heading levels contiguous across the move into the band", async () => {
    // The h1 left <Container> for a full-bleed sibling above it. Document
    // order is what heading-order reads, so this is the check that the move
    // did not reorder anything relative to the listing's h2s.
    await render();
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("has exactly one h1, and it is the band's", async () => {
    await render();
    const h1s = [...document.querySelectorAll("h1")];
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe("Design");
  });

  it("renders exactly one breadcrumb trail", async () => {
    // The band owns the trail now. Two would mean a route kept its own after
    // the shell grew one — a duplicate landmark and a duplicate tab sequence.
    await render();
    expect(
      document.querySelectorAll('nav[aria-label="Breadcrumb"]'),
    ).toHaveLength(1);
  });
});

describe("the index listing, which carries a trail again", () => {
  // A REVERSAL, recorded as one. /page/[page] shipped without a trail on the
  // argument that both its crumbs would point at /. They would not: the last
  // crumb is never a link here, so the trail is Home / Latest Posts with one
  // link, and the objection was to a shape this site does not build. The page
  // number still stays out of it, because position is a state rather than a
  // level and PageContext captions the list with it.
  //
  // `crumbs` stays optional on the band regardless. Home is the only route
  // using that now, which is correct, since home is the root.
  const render = () =>
    renderPage(
      <RootLayout>
        <ListingPage
          crumbs={[{ label: "Home", href: "/" }, { label: "Latest Posts" }]}
          posts={[post("a", ["Design"]), post("b", ["Retro"])]}
          currentPage={2}
          totalPages={3}
          visibleTags={new Set(["design", "retro"])}
          basePath="/"
        >
          <h1>Latest Posts</h1>
          {/* Fixture prose. The real standfirst comes from the browseIntro
              entry keyed "latest-posts" and nothing here asserts its wording,
              so this stands in for "the band has a standfirst" and no more. */}
          <p className="max-w-3xl text-lg leading-relaxed text-pretty">
            A standfirst, of the length one usually runs to.
          </p>
        </ListingPage>
      </RootLayout>,
    );

  it("emits a breadcrumb landmark, with only the first crumb linked", async () => {
    await render();
    const trails = document.querySelectorAll('nav[aria-label="Breadcrumb"]');
    expect(trails).toHaveLength(1);
    const links = trails[0].querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/");
  });

  it("keeps heading levels contiguous", async () => {
    await render();
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("has exactly one h1, and it is the band's", async () => {
    await render();
    const h1s = [...document.querySelectorAll("h1")];
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe("Latest Posts");
  });
});

describe("home, whose band carries the masthead as its h1", () => {
  // The masthead is home's h1 and everything below it is an h2, hero and cards
  // alike, because the listing renders no heading of its own. One flat list of
  // siblings under one page title.
  //
  // The assertions fail if any half is reverted on its own, which is the
  // failure worth guarding: the masthead was a <p> precisely to protect a hero
  // h1 that no longer exists, so putting one back without demoting the other
  // gives the page two h1s and nothing complains at runtime. Reinstating the
  // listing heading is the same shape of mistake from the other end, since
  // MoreStories silently re-levels every card title when one is present.
  const render = () =>
    renderPage(
      <RootLayout>
        <WidePage
          header={
            <>
              <h1 className="site-masthead mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl">
                {SITE_TITLE}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed">
                A description of the site.
              </p>
            </>
          }
        >
          <section className="mx-auto max-w-5xl mb-section">
            <h2>
              <a href="/posts/a">Post a</a>
            </h2>
            <p>Excerpt for post a.</p>
          </section>
          <MoreStories
            morePosts={[post("b"), post("c")]}
            variant="grid"
            heading={null}
          />
        </WidePage>
      </RootLayout>,
    );

  it("has no axe violations", async () => {
    expectNoViolations(await render());
  });

  it("renders no Latest Posts heading", async () => {
    // Text, not level. A bare level check passes if someone reinstates the
    // heading as an h2, which is exactly what MoreStories would emit.
    await render();
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => h.textContent?.trim(),
    );
    expect(headings).not.toContain("Latest Posts");
  });

  it("puts the hero and every card title at the same level", async () => {
    // The point of dropping the heading. The hero stops being a section with
    // its own level and becomes the first entry in one list.
    await render();
    const main = document.querySelector("main")!;
    const levels = [...main.querySelectorAll("h2,h3")].map((h) =>
      Number(h.tagName[1]),
    );
    expect(levels.length).toBeGreaterThan(1);
    expect(new Set(levels)).toEqual(new Set([2]));
  });

  it("has exactly one h1, and it is the masthead", async () => {
    await render();
    const h1s = [...document.querySelectorAll("h1")];
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(SITE_TITLE);
    expect(h1s[0].classList.contains("site-masthead")).toBe(true);
  });

  it("renders the hero title as an h2, still linked to its post", async () => {
    await render();
    const hero = document.querySelector("main h2 a");
    expect(hero).not.toBeNull();
    expect(hero!.getAttribute("href")).toBe("/posts/a");
  });

  it("keeps heading levels contiguous below a band with no heading in it", async () => {
    await render();
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("emits no breadcrumb landmark", async () => {
    await render();
    expect(
      document.querySelectorAll('nav[aria-label="Breadcrumb"]'),
    ).toHaveLength(0);
  });

  it("names the site once, in halves this environment cannot join", async () => {
    // Both marks are in the DOM. What hides the bar's is a :has() rule, and
    // jsdom applies no stylesheet, so a single querySelectorAll here would
    // report two and prove nothing either way. The halves are asserted
    // separately: the markup carries exactly the two hooks, and the
    // stylesheet carries the rules that govern them.
    await render();
    expect(document.querySelectorAll(".site-masthead")).toHaveLength(1);
    expect(document.querySelectorAll(".site-wordmark")).toHaveLength(1);

    const css = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");

    // The tagline's fallback half, which is also its state below lg. Still
    // display: none, but no longer unconditional — see the lg-scoped fade
    // asserted at the end of this test.
    const tagline =
      /body:has\(\.site-masthead\)\s+\.site-tagline\s*\{([^}]*)\}/.exec(css);
    expect(tagline).not.toBeNull();
    expect(tagline![1]).toMatch(/display:\s*none/);

    // The wordmark half is the fallback the fade degrades to. display: none,
    // never visibility: hidden — a hidden element still carries its
    // view-transition-name and would collide with the masthead's.
    const wordmark =
      /body:has\(\.site-masthead\)\s+\.site-wordmark\s*\{([^}]*)\}/.exec(css);
    expect(wordmark).not.toBeNull();
    expect(wordmark![1]).toMatch(/display:\s*none/);
    // Stripped of comments first: the rule's own comment explains why not
    // visibility, which would otherwise make this assertion match its own
    // explanation instead of a real declaration.
    expect(wordmark![1].replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(
      /visibility/,
    );
    // Without this the fade's invisible box would claim the same
    // view-transition-name the masthead already holds on home.
    expect(wordmark![1]).toMatch(/view-transition-name:\s*none/);

    // The fade itself, and its reduced-motion escape. Asserted so the
    // component and the stylesheet cannot drift apart: app/wordmark-fade.tsx
    // sets both class names and neither does anything without a rule here.
    expect(css).toMatch(/\.js-wordmark-observed\s+\.site-wordmark/);
    expect(css).toMatch(/\.wordmark-visible\s+\.site-wordmark/);
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]{0,200}js-wordmark-observed/,
    );

    // The faded-out state must not be operable. opacity alone leaves a box
    // that takes a tab stop and a click, which is what shipped first: an
    // invisible link over the blank space in the bar. Asserted on the rule
    // rather than the DOM because jsdom applies no stylesheet.
    const faded =
      /body:has\(\.site-masthead\)\.js-wordmark-observed\s+\.site-wordmark\s*\{([^}]*)\}/.exec(
        css,
      );
    expect(faded).not.toBeNull();
    expect(faded![1]).toMatch(/visibility:\s*hidden/);

    // And the faded-in state must restore it, or the wordmark would be
    // permanently unreachable rather than permanently reachable.
    const shown =
      /\.js-wordmark-observed\.wordmark-visible\s+\.site-wordmark\s*\{([^}]*)\}/.exec(
        css,
      );
    expect(shown).not.toBeNull();
    expect(shown![1]).toMatch(/visibility:\s*visible/);

    // The tagline fades with the wordmark, and only at lg and up. Both halves
    // matter. Without the media query these unlayered rules beat the markup's
    // `hidden` and put a full site description in a phone's 52px bar; without
    // the rules at all, home's scrolled bar is the one place on the site
    // carrying a wordmark and no tagline.
    const taglineFade =
      /@media\s*\(min-width:\s*64rem\)\s*\{([\s\S]*?\.site-tagline[\s\S]*?)\n\}/.exec(
        css,
      );
    expect(taglineFade).not.toBeNull();
    expect(taglineFade![1]).toMatch(
      /js-wordmark-observed[\s\S]*\.site-tagline/,
    );
    expect(taglineFade![1]).toMatch(/display:\s*block/);
    expect(taglineFade![1]).toMatch(/visibility:\s*hidden/);
    expect(taglineFade![1]).toMatch(/visibility:\s*visible/);

    // The breakpoint is one decision in two places. If the markup's utility
    // and the stylesheet's query ever disagree, the tagline either appears on
    // mobile or never appears at all, and neither shows up in a unit test
    // that only reads one of them.
    const layout = fs.readFileSync(path.join(__dirname, "layout.tsx"), "utf8");
    expect(layout).toMatch(/site-tagline[^"]*\blg:block\b/);
  });
});

describe("post page", () => {
  const render = () =>
    renderPage(
      <RootLayout>
        <div className="mx-auto max-w-5xl px-5 py-8">
          <article>
            <Breadcrumb
              items={[
                { label: "Home", href: "/" },
                { label: "Archive", href: "/archive" },
                { label: "A post title" },
              ]}
            />
            <h1>A post title</h1>
            <CoverImage
              url="https://images.ctfassets.net/x/y/cover.jpg"
              wide
              priority
            />
            <Avatar
              name="Bulent Yusuf"
              slug="bulent-yusuf"
              meta={<span>1 January 2026</span>}
            />
            <div className="prose">
              <RichText
                content={bodyContent}
                headings={extractHeadings(bodyDoc)}
              />
            </div>
          </article>
        </div>
      </RootLayout>,
    );

  it("has no axe violations", async () => {
    expectNoViolations(await render());
  });

  it("announces each destination exactly once", async () => {
    await render();
    expect(duplicateLinksInMain()).toEqual([]);
  });

  it("keeps heading levels contiguous", async () => {
    await render();
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("never repeats a figure's caption as its alt text", async () => {
    // alt and caption are separate Contentful fields and must stay separate
    // strings. If they ever match, a screen reader announces one sentence
    // twice in a row, which is the failure the old empty-alt rule existed to
    // avoid. Only applies where a figure actually holds an image — the
    // PromptBlock figure in this fixture has none, and its figcaption names
    // the prompt, not a picture.
    await render();
    for (const figure of document.querySelectorAll("figure")) {
      const img = figure.querySelector("img");
      if (!img) continue;
      const caption = figure.querySelector("figcaption")?.textContent?.trim();
      const alt = img.getAttribute("alt")?.trim();
      if (caption && alt) expect(alt).not.toBe(caption);
    }
  });

  it("gives every header cell a column scope", async () => {
    await render();
    const headerCells = document.querySelectorAll("table th");
    expect(headerCells.length).toBeGreaterThan(0);
    for (const th of headerCells) {
      expect(th.getAttribute("scope")).toBe("col");
    }
  });

  it("exposes the scroll container as a focusable, named region", async () => {
    await render();
    const region = getByRole(document.body, "region", { name: "Table" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.querySelector("table")).not.toBeNull();
  });

  it("aligns every cell start, header included", async () => {
    // Per-cell numeric inference made the header disagree with its own
    // column by construction ("Posts" isn't a number, its digits are) — every
    // value in a real table is a single digit anyway, so there's nothing for
    // right-alignment to buy. All cells are start-aligned, uniformly.
    await render();
    const cells = [
      ...document.querySelectorAll("table th"),
      ...document.querySelectorAll("table td"),
    ];
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.classList.contains("text-start")).toBe(true);
      expect(cell.classList.contains("text-end")).toBe(false);
    }
  });

  it("shrinks a bare-number column but not a text one", async () => {
    // w-full stretches the table to the full prose measure, and auto layout
    // otherwise spreads that surplus across every column regardless of need —
    // a single digit was landing in a column wide enough for a sentence.
    // w-[1%] + whitespace-nowrap tells auto layout this column's minimum is
    // its own content, freeing the surplus for columns that use it.
    await render();
    const cells = [...document.querySelectorAll("table td")];
    const numericCell = cells.find((td) => td.textContent?.trim() === "12");
    const textCell = cells.find((td) => td.textContent?.trim() === "Design");
    expect(numericCell?.classList.contains("w-[1%]")).toBe(true);
    expect(numericCell?.classList.contains("whitespace-nowrap")).toBe(true);
    expect(textCell?.classList.contains("w-[1%]")).toBe(false);
    expect(textCell?.classList.contains("whitespace-nowrap")).toBe(false);
  });
});

describe("prompt block", () => {
  // A minimal body holding only the embedded PromptBlock under test, so role
  // queries never have to disambiguate against the cover, avatar or other
  // fixtures used elsewhere in this file.
  function promptBody(entry: Record<string, unknown>) {
    const doc = {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: [embed(BLOCKS.EMBEDDED_ENTRY, "prompt1")],
    } as unknown as Document;
    const content = {
      json: doc,
      links: {
        entries: {
          block: [
            { sys: { id: "prompt1" }, __typename: "PromptBlock", ...entry },
          ],
          inline: [],
        },
      },
    } as unknown as Content;
    return { doc, content };
  }

  async function renderPrompt(entry: Record<string, unknown>) {
    const { doc, content } = promptBody(entry);
    await renderPage(
      <RootLayout>
        <div className="mx-auto max-w-5xl px-5 py-8">
          <article>
            <div className="prose">
              <RichText content={content} headings={extractHeadings(doc)} />
            </div>
          </article>
        </div>
      </RootLayout>,
    );
  }

  // dom-accessibility-api implements the generic ARIA accname algorithm, not
  // the HTML-AAM rule naming a <figure> from a first-or-last-child
  // <figcaption> — a jsdom/tooling gap (real browsers, and axe in one, do
  // compute this), the same category as the color-contrast/target-size rules
  // disabled above. getByRole locates the element; the name itself is read
  // from the figcaption directly rather than through a name-option filter
  // that this environment cannot resolve.
  it("exposes an accessible name matching its label", async () => {
    await renderPrompt({ label: "A prompt", prompt: "Draw a cat" });
    const figure = getByRole(document.body, "figure");
    expect(figure.querySelector("figcaption")?.textContent?.trim()).toBe(
      "A prompt",
    );
  });

  it("keeps the figcaption as the figure's direct child", async () => {
    // The constraint most likely to be broken by a later layout change, and it
    // fails silently: a figcaption nested in a wrapper div no longer names the
    // figure at all.
    await renderPrompt({ label: "A prompt", prompt: "Draw a cat" });
    const figure = getByRole(document.body, "figure");
    expect(figure.firstElementChild?.tagName).toBe("FIGCAPTION");
  });

  it('falls back to "Prompt" when the label is absent', async () => {
    await renderPrompt({ prompt: "Draw a cat" });
    const figure = getByRole(document.body, "figure");
    expect(figure.querySelector("figcaption")?.textContent?.trim()).toBe(
      "Prompt",
    );
  });

  it("hides the decorative thumbnail from the accessibility tree", async () => {
    await renderPrompt({
      label: "A prompt",
      prompt: "Draw a cat",
      image: { url: "https://images.ctfassets.net/x/y/thumb.jpg" },
    });
    expect(queryByRole(document.body, "img")).toBeNull();
  });
});
