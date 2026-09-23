import { describe, it, expect } from "vitest";
import { coverPromptId } from "./cover-prompt";
import type { Content, CoverImage } from "./types";

const COVER = "https://images.ctfassets.net/space/coverAsset/hash/cover.jpg";
const OTHER = "https://images.ctfassets.net/space/otherAsset/hash/other.jpg";

const post = (
  coverImage: CoverImage | undefined,
  block: unknown[],
): { coverImage?: CoverImage; content: Content } => ({
  coverImage,
  content: {
    json: { nodeType: "document", data: {}, content: [] },
    links: { assets: { block: [] }, entries: { block, inline: [] } },
  } as unknown as Content,
});

const prompt = (id: string, url?: string) => ({
  __typename: "PromptBlock",
  sys: { id },
  prompt: "gouache illustration",
  ...(url ? { image: { url } } : {}),
});

describe("coverPromptId", () => {
  it("returns the prompt block whose thumbnail is the cover", () => {
    const p = post({ url: COVER }, [
      prompt("inline", OTHER),
      prompt("cover", COVER),
    ]);
    expect(coverPromptId(p)).toBe("cover");
  });

  // Known-bad control: a post whose only prompt block illustrates a body
  // image. If the match ever loosened to "any prompt block", this would
  // return "inline" and the pill would point at the wrong prompt.
  it("returns undefined when no prompt block carries the cover", () => {
    const p = post({ url: COVER }, [prompt("inline", OTHER)]);
    expect(coverPromptId(p)).toBeUndefined();
  });

  it("ignores text-only prompts and code blocks", () => {
    const code = { __typename: "CodeBlock", sys: { id: "code" }, code: "x" };
    const p = post({ url: COVER }, [code, prompt("textOnly")]);
    expect(coverPromptId(p)).toBeUndefined();
  });

  it("returns undefined for a post without a cover", () => {
    const p = post(undefined, [prompt("cover", COVER)]);
    expect(coverPromptId(p)).toBeUndefined();
  });
});
