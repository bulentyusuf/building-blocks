import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { postContributors, postsWithContributor } from "./contributors";
import type { Contributor } from "./types";

const contributor = (slug: string, name = slug): Contributor => ({
  name,
  slug,
});

// Only the shape the helpers read. The real Post carries a dozen more fields
// none of this touches.
const post = (
  slug: string,
  contributors: Contributor[],
  authorSlug?: string,
) => ({
  slug,
  author: authorSlug ? { slug: authorSlug } : undefined,
  contributorsCollection: { items: contributors },
});

describe("postContributors", () => {
  it("returns an empty array when the field is absent entirely", () => {
    expect(postContributors({ contributorsCollection: undefined })).toEqual([]);
  });

  it("returns an empty array on an empty items array", () => {
    expect(postContributors({ contributorsCollection: { items: [] } })).toEqual(
      [],
    );
  });

  it("drops a contributor whose slug matches the primary author", () => {
    const a = contributor("bulent", "Bulent");
    const b = contributor("genial-yeti", "Genial Yeti");
    expect(postContributors(post("p", [a, b], "bulent"))).toEqual([b]);
  });

  it("keeps a contributor with no slug even when a primary author exists", () => {
    const noSlug: Contributor = { name: "No Slug" };
    expect(postContributors(post("p", [noSlug], "bulent"))).toEqual([noSlug]);
  });
});

describe("postsWithContributor", () => {
  it("returns matches in input order", () => {
    const a = post("a", [contributor("yeti")]);
    const b = post("b", [contributor("robot")]);
    const c = post("c", [contributor("yeti")]);

    expect(postsWithContributor([a, b, c], "yeti")).toEqual([a, c]);
  });

  it("returns an empty array on no match", () => {
    expect(
      postsWithContributor([post("a", [contributor("yeti")])], "nope"),
    ).toEqual([]);
  });

  it("returns a post where the same person is author and contributor, since only the render dedupes", () => {
    const p = post("p", [contributor("bulent")], "bulent");
    expect(postsWithContributor([p], "bulent")).toEqual([p]);
  });
});

// --- ContributorLine ---------------------------------------------------

const { default: ContributorLine } = await import("../app/contributor-line");

const html = (contributors: Contributor[]) =>
  renderToStaticMarkup(ContributorLine({ contributors }));

describe("ContributorLine", () => {
  it("renders nothing for zero contributors", () => {
    expect(html([])).toBe("");
  });

  it("renders one name with no joining word, and no comma or 'and'", () => {
    const out = html([contributor("yeti", "Genial Yeti")]);
    expect(out).toContain("Genial Yeti");
    expect(out).not.toContain(",");
    expect(out).not.toContain(" and ");
  });

  it("renders two names joined by 'and'", () => {
    const out = html([
      contributor("yeti", "Genial Yeti"),
      contributor("robot", "Trippy Robot"),
    ]);
    expect(out).toContain("Genial Yeti");
    expect(out).toContain(" and ");
    expect(out).toContain("Trippy Robot");
  });

  it("renders three names as 'A, B and C'", () => {
    const out = html([
      contributor("a", "A"),
      contributor("b", "B"),
      contributor("c", "C"),
    ]);
    expect(out).toContain("A, B and C");
  });

  it("pluralises the label for more than one contributor", () => {
    expect(html([{ name: "A" }])).toContain("Contributor");
    expect(html([{ name: "A" }])).not.toContain("Contributors");
    expect(html([{ name: "A" }, { name: "B" }])).toContain("Contributors");
  });

  // The guard on the plain-text decision. Without this, a future edit could
  // reintroduce links and every other assertion above would still pass.
  it("renders no anchor element at all, for any input", () => {
    const cases = [
      [],
      [contributor("a")],
      [contributor("a"), contributor("b")],
      [contributor("a"), contributor("b"), contributor("c")],
    ];
    for (const contributors of cases) {
      expect(html(contributors)).not.toContain("<a ");
    }
  });
});
