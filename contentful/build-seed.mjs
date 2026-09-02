import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The seed uses en-US as its locale key deliberately: it is the default locale
// of a fresh, unconfigured Contentful space, which is what a forker imports
// into. This is independent of any downstream locale rename a forker may do
// later (e.g. to en-GB); the import targets the space's default locale. Do not
// change this key.
const L = "en-US";
const loc = (v) => ({ [L]: v });
const link = (id, linkType = "Entry") => ({
  sys: { type: "Link", linkType, id },
});

const PLACEHOLDER_ASSET_URL =
  "https://raw.githubusercontent.com/bulentyusuf/building-blocks/main/contentful/seed-assets/placeholder.jpg";

const text = (value) => ({ nodeType: "text", value, marks: [], data: {} });
const paragraph = (...kids) => ({
  nodeType: "paragraph",
  data: {},
  content: kids,
});
const heading2 = (value) => ({
  nodeType: "heading-2",
  data: {},
  content: [text(value)],
});
const embed = (id) => ({
  nodeType: "embedded-entry-block",
  data: { target: link(id) },
  content: [],
});
// A pull quote: BLOCKS.QUOTE must wrap a paragraph, not raw text.
const quote = (value) => ({
  nodeType: "blockquote",
  data: {},
  content: [paragraph(text(value))],
});
// A wide inline figure. Unlike embed() (an embedded ENTRY), this links an
// ASSET, so linkType must be "Asset".
const embedAsset = (id) => ({
  nodeType: "embedded-asset-block",
  data: { target: link(id, "Asset") },
  content: [],
});
const doc = (...content) => ({ nodeType: "document", data: {}, content });

// A text node carrying marks. Contentful's mark shape is an array of objects,
// not an array of strings, and the renderer silently drops malformed marks.
const marked = (value, ...marks) => ({
  nodeType: "text",
  value,
  marks: marks.map((type) => ({ type })),
  data: {},
});

// An external hyperlink. The renderer allowlists URL schemes and gives
// cross-origin links their new-window treatment, none of which the seed
// exercised before.
const linkTo = (uri, label) => ({
  nodeType: "hyperlink",
  data: { uri },
  content: [text(label)],
});

// An inline embedded entry, the Sidenote reference point. Unlike embed(), which
// is a BLOCK, this sits inside a paragraph's content array. Its absence from
// this file while present in seed.json was the drift this generator now closes:
// regenerating used to silently delete the seeded sidenote.
const inlineEmbed = (id) => ({
  nodeType: "embedded-entry-inline",
  data: { target: link(id) },
  content: [],
});

const heading3 = (value) => ({
  nodeType: "heading-3",
  data: {},
  content: [text(value)],
});
const listItem = (...kids) => ({
  nodeType: "list-item",
  data: {},
  content: kids,
});
const bulletList = (...items) => ({
  nodeType: "unordered-list",
  data: {},
  content: items,
});
const rule = () => ({ nodeType: "hr", data: {}, content: [] });

// publishedVersion makes contentful-import publish the entity. Verify after import.
const published = (sys) => ({ ...sys, publishedVersion: 1 });
const ct = (id) => ({ sys: { type: "Link", linkType: "ContentType", id } });
const entry = (id, contentType, fields) => ({
  sys: published({ id, type: "Entry", contentType: ct(contentType) }),
  fields,
});

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";
const LOREM2 =
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa.";

// The showcase post needs real length, not just structure: a sticky sidebar
// table of contents that never scrolls demonstrates nothing, and the scroll spy
// needs several viewports of body to move through at xl and above. These buy
// that height in the same register as the two above. Replace the lot when you
// write your own first post.
const LOREM3 =
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Voluptatem accusantium doloremque laudantium totam rem aperiam, eaque ipsa quae ab illo inventore veritatis architecto beatae vitae dicta sunt explicabo. Sed quia magni dolores eos qui ratione sequi nesciunt, adipisci numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem, ut enim ad minima veniam quis nostrum exercitationem ullam corporis suscipit laboriosam.";
const LOREM4 =
  "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Nam libero tempore cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus. Omnis voluptas assumenda est, omnis dolor repellendus, temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae itaque earum rerum.";
const LOREM5 =
  "Et harum quidem rerum facilis est et expedita distinctio. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat omnis voluptas assumenda. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur atque corrupti quos dolores et quas molestias.";
const LOREM6 =
  "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur atque corrupti quos dolores et quas molestias excepturi.";
const LOREM7 =
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione sequi nesciunt.";
const LOREM8 =
  "Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat, duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat. Duis aute irure dolor in voluptate velit esse cillum dolore, excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum et dolorum fuga.";
const LOREM9 =
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, nulla gravida orci a odio, nullam varius turpis et commodo pharetra est eros bibendum urna, sed luctus ligula. Maecenas malesuada elit lectus felis, malesuada ultricies, curabitur et ligula ut sapien pellentesque tempus a commodo mollis. Nam sed tellus id magna elementum tincidunt, praesent egestas leo in pede, quisque libero metus condimentum nec tempor a commodo mollis magna vestibulum ante ipsum primis in faucibus orci.";
const LOREM10 =
  "Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim, phasellus molestie magna non est bibendum non venenatis nisl tempor, suspendisse dictum feugiat nisl ut dapibus mauris iaculis vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Aenean nec lorem in tellus dignissim rutrum, etiam ut purus mattis mauris sodales aliquam, curabitur nisi quisque malesuada placerat nisl a tincidunt nunc ullamcorper velit in mauris pellentesque.";

const CONTENTFUL_RICH_TEXT_DOCS =
  "https://www.contentful.com/developers/docs/concepts/rich-text/";

const asset = {
  sys: published({ id: "placeholder-image", type: "Asset" }),
  fields: {
    title: loc("Placeholder image"),
    description: loc("Seed placeholder. Replace with your own image."),
    file: loc({
      contentType: "image/jpeg",
      fileName: "placeholder.jpg",
      url: PLACEHOLDER_ASSET_URL,
    }),
  },
};

const ph = () => loc(link("placeholder-image", "Asset"));

const entries = [
  entry("cat-main-quest", "category", {
    name: loc("Main Quest"),
    slug: loc("main-quest"),
    description: loc("The headline projects and the long builds."),
    thumbnail: ph(),
  }),
  entry("cat-side-quests", "category", {
    name: loc("Side Quests"),
    slug: loc("side-quests"),
    description: loc("Smaller experiments and detours."),
    thumbnail: ph(),
  }),
  entry("author-alex", "author", {
    name: loc("Alex Placeholder"),
    slug: loc("alex-placeholder"),
    picture: ph(),
    bio: loc(doc(paragraph(text(LOREM)))),
  }),
  entry("author-sam", "author", {
    name: loc("Sam Example"),
    slug: loc("sam-example"),
    picture: ph(),
    bio: loc(doc(paragraph(text(LOREM2)))),
  }),
  // Two tags, each on two posts. The /tags glossary hides anything with fewer
  // than two, so a single tag on a single post would ship a fork a page that
  // renders nothing — the same failure mode as a table of contents that never
  // appears. Two overlapping tags also give post-second two of them, which is
  // what makes the glossary's repeated-post behaviour visible.
  entry("tag-craft", "tag", {
    name: loc("Craft"),
    slug: loc("craft"),
    description: loc("How the thing was built, and what the building taught."),
  }),
  entry("tag-detours", "tag", {
    name: loc("Detours"),
    slug: loc("detours"),
    description: loc("The tangents worth writing down."),
  }),
  // One per browse page, so a fork can edit its own standfirsts rather than
  // finding them hard-coded. Archive deliberately carries no standfirst: its
  // heading line is generated from the post count and stays current on its own,
  // and typed prose there would be stale by the next post. Latest Posts is the
  // odd one out — its slug names the /page/[page] route rather than a content
  // type — and it has no fallback standfirst in code, so a fork without this
  // entry gets a heading and nothing under it.
  entry("intro-tags", "browseIntro", {
    title: loc("Tags"),
    slug: loc("tags"),
    standfirst: loc(
      "Categories say where a post lives; tags say what it is about, so a post can carry up to three.",
    ),
    metaDescription: loc(
      "Every topic on this site, with the posts filed under each.",
    ),
  }),
  entry("intro-categories", "browseIntro", {
    title: loc("Categories"),
    slug: loc("categories"),
    standfirst: loc("Every post has a home. Pick a path."),
    metaDescription: loc("Browse posts by category."),
  }),
  entry("intro-authors", "browseIntro", {
    title: loc("Authors"),
    slug: loc("authors"),
    standfirst: loc("Who writes what around here."),
    metaDescription: loc("Meet the authors."),
  }),
  entry("intro-archive", "browseIntro", {
    title: loc("Archive"),
    slug: loc("archive"),
    metaDescription: loc("Every post, grouped by year."),
  }),
  entry("intro-latest-posts", "browseIntro", {
    title: loc("Latest Posts"),
    slug: loc("latest-posts"),
    standfirst: loc("Everything published here, newest first."),
    metaDescription: loc("Browse the latest posts, newest first."),
  }),
  entry("code-example", "codeBlock", {
    filename: loc("example.tsx"),
    language: loc("tsx"),
    code: loc(
      "export default function Hello() {\n  return <p>Hello from the template</p>;\n}",
    ),
  }),
  entry("prompt-example", "promptBlock", {
    label: loc("Midjourney"),
    prompt: loc(
      "a calm editorial illustration, warm directional light, gouache texture",
    ),
  }),
  // One sidenote entry, referenced from two posts. This entry existed in
  // seed.json but not here, so every regeneration deleted it along with the
  // inline embed in post-first; the drift guard in
  // lib/contentful-fixtures.test.ts now fails if the two part company again.
  entry("sidenote-example", "sidenote", {
    title: loc("Example sidenote"),
    note: loc(
      doc(
        paragraph(
          text(
            "Notes float into the right margin on wide screens and collapse behind their number on narrow ones.",
          ),
        ),
      ),
    ),
  }),
  entry("post-first", "post", {
    title: loc("The first placeholder post"),
    slug: loc("first-placeholder-post"),
    date: loc("2026-05-01"),
    // The only seeded post with an updatedDate, so the "Published / Updated"
    // line renders on exactly one page and the single-date case stays visible
    // on the other two.
    updatedDate: loc("2026-05-20"),
    coverImage: ph(),
    excerpt: loc("A short placeholder excerpt for the first seeded post."),
    // The showcase body. Five H2s clear the `< 3` gate in
    // app/table-of-contents.tsx with room to spare, and every branch of the
    // renderer appears once: a mark, an external link, an inline sidenote, a
    // pull quote, an asset, a list, an H3, a rule and both embedded blocks.
    content: loc(
      doc(
        paragraph(
          text(
            "This post exists to exercise the renderer rather than to be read. It carries ",
          ),
          marked("a bold run", "bold"),
          text(", a link out to the "),
          linkTo(
            CONTENTFUL_RICH_TEXT_DOCS,
            "Contentful rich text documentation",
          ),
          text(", and a sidenote"),
          inlineEmbed("sidenote-example"),
          text(
            " anchored mid-sentence so the marker lands while the prose is still running. ",
          ),
          text(LOREM),
        ),
        quote(
          "A pull quote lifts a single line out of the flow and gives it room to breathe.",
        ),
        heading2("Background"),
        paragraph(text(LOREM2)),
        paragraph(text(LOREM3)),
        paragraph(text(LOREM4)),
        embedAsset("placeholder-image"),
        heading2("How the pieces fit"),
        paragraph(text(LOREM5)),
        bulletList(
          listItem(
            paragraph(
              text(
                "A list item, to show that lists render inside the prose column.",
              ),
            ),
          ),
          listItem(
            paragraph(text("A second item, because one is not a list.")),
          ),
          listItem(
            paragraph(
              text("A third, carrying "),
              marked("an emphasised phrase", "italic"),
              text(", since marks survive inside list items too."),
            ),
          ),
          listItem(
            paragraph(
              text("A fourth, so the spacing between items is legible."),
            ),
          ),
        ),
        paragraph(text(LOREM6)),
        // H3s render but are deliberately absent from the table of contents,
        // which is H2-only by design in lib/headings.ts. Seeding one makes that
        // visible rather than something a forker has to discover.
        heading3("A subheading below the fold"),
        paragraph(text(LOREM7)),
        heading2("A code block"),
        paragraph(text(LOREM8)),
        embed("code-example"),
        heading2("A prompt block"),
        paragraph(text(LOREM9)),
        embed("prompt-example"),
        rule(),
        heading2("Where this leaves us"),
        paragraph(text(LOREM10)),
        paragraph(text(LOREM3)),
        paragraph(text(LOREM2)),
      ),
    ),
    author: loc(link("author-alex")),
    // The only seeded post carrying a contributor, so a fork's build renders
    // both paths: this one shows the credit line under the byline, the other
    // two posts show a post with no contributors renders exactly as before.
    contributors: loc([link("author-sam")]),
    category: loc(link("cat-main-quest")),
    tags: loc([link("tag-craft")]),
  }),
  entry("post-second", "post", {
    title: loc("A second sample entry"),
    slug: loc("second-sample-entry"),
    date: loc("2026-05-08"),
    coverImage: ph(),
    excerpt: loc("A short placeholder excerpt for the second seeded post."),
    // Three H2s, so a forker can see the table of contents is not a quirk of
    // one post. Shorter than post-first on purpose: enough to render the TOC,
    // not enough to need the scroll spy.
    content: loc(
      doc(
        paragraph(
          text(LOREM2),
          text(" A note"),
          inlineEmbed("sidenote-example"),
          text(" appears here too, so the sidenote is not a one-post feature."),
        ),
        embedAsset("placeholder-image"),
        heading2("A prompt block follows"),
        paragraph(text(LOREM)),
        embed("prompt-example"),
        heading2("Reading further"),
        paragraph(
          text("The node types in this body are all documented in the "),
          linkTo(
            CONTENTFUL_RICH_TEXT_DOCS,
            "Contentful rich text documentation",
          ),
          text(". "),
          text(LOREM7),
        ),
        bulletList(
          listItem(
            paragraph(text("Lists render here as well as in the first post.")),
          ),
          listItem(
            paragraph(text("Two items is the minimum that reads as a list.")),
          ),
          listItem(paragraph(text("Three leaves room to see the spacing."))),
        ),
        paragraph(text(LOREM6)),
        heading2("Where this one ends"),
        paragraph(text(LOREM5)),
        paragraph(text(LOREM4)),
      ),
    ),
    author: loc(link("author-sam")),
    category: loc(link("cat-side-quests")),
    tags: loc([link("tag-craft"), link("tag-detours")]),
  }),
  entry("post-third", "post", {
    title: loc("One more for the archive"),
    slug: loc("one-more-for-the-archive"),
    date: loc("2026-05-15"),
    coverImage: ph(),
    excerpt: loc("A short placeholder excerpt for the third seeded post."),
    // Deliberately headingless and short. This is the control case: it shows
    // the table of contents correctly rendering nothing below the three-H2
    // threshold. Do not "fix" it by adding headings.
    content: loc(doc(paragraph(text(LOREM)), paragraph(text(LOREM2)))),
    author: loc(link("author-alex")),
    category: loc(link("cat-main-quest")),
    tags: loc([link("tag-detours")]),
  }),
  entry("page-about", "page", {
    title: loc("About"),
    slug: loc("about"),
    body: loc(doc(paragraph(text(LOREM)), paragraph(text(LOREM2)))),
  }),
  entry("page-privacy", "page", {
    title: loc("Privacy"),
    slug: loc("privacy"),
    body: loc(doc(paragraph(text(LOREM)))),
  }),
];

const outputPath = process.argv[2] || "contentful/seed.json";
const payload = { assets: [asset], entries };

// Only write when run as a script. The drift guard in
// lib/contentful-fixtures.test.ts regenerates into a temp file and compares, so
// importing this module must not clobber the committed seed as a side effect.
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `Wrote ${outputPath}: ${payload.assets.length} asset, ${payload.entries.length} entries.`,
  );
}
