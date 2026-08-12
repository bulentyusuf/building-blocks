import { describe, it, expect } from "vitest";
import { isPlaceholderTitle, filenameStem } from "./placeholder-title";

// The known-bad control this guard is measured against.
//
// Every string below was a real `title` in the live space on 11 August 2026,
// when the whole library used the field as a filing label. They stay here
// permanently, exactly as app/posts/[slug]/opengraph-image.font.test.tsx keeps
// Piazzolla: a guard that asserts the absence of a defect passes for two
// reasons, and only a case that still fails tells the two apart.
//
// Do not "tidy" these into invented examples. Their value is that they shipped.
const PLACEHOLDERS: ReadonlyArray<[string, string | undefined]> = [
  ["wages", "wages.jpg"],
  ["artdirector", "artdirector.jpg"],
  ["videogames", "videogames.jpg"],
  ["content library", "content_library.jpg"],
  ["Plant Cutting", "plant_cutting.jpg"],
  ["NH-PCB", "NH-PCB.webp"],
  ["light-mode", "light-mode.png"],
  ["Side Quests", "Side_Quests.jpg"],
  ["The blueprint", "TheBlueprint.jpg"],
  ["Gemini Generated Image lpheaolpheaolphe", undefined],
  ["Screenshot 2026-06-09 at 00.09.25", undefined],
];

// Real titles from the same space after the content pass. These must never
// trip the guard, and three of them are the reason it is written narrowly:
// they name the medium ("A screenshot of…", "A screengrab of…") without being
// placeholders, and a looser prefix rule would flag all of them.
const DESCRIPTIONS: ReadonlyArray<[string, string | undefined]> = [
  [
    "A leafy plant cutting rooting in a glass jar of water on a sunlit windowsill",
    "plant_cutting.jpg",
  ],
  [
    "A nightclub entrance on a Saturday night in inner-city London",
    "thebouncer.jpg",
  ],
  [
    "A photo of the video game Populous in its original PC big box",
    "DSC_2122.JPG",
  ],
  [
    'A screenshot of a search results page, showing results for "happiness"',
    "Screenshot 2026-07-26 at 15.58.23.png",
  ],
  ["A screengrab of a web page in light mode", "light-mode.png"],
  [
    "The underside of a printed circuit board for a mechanical keyboard",
    "NH-PCB.webp",
  ],
];

describe("isPlaceholderTitle", () => {
  it.each(PLACEHOLDERS)("flags %j", (title, fileName) => {
    expect(isPlaceholderTitle(title, fileName)).toBe(true);
  });

  it.each(DESCRIPTIONS)("accepts %j", (title, fileName) => {
    expect(isPlaceholderTitle(title, fileName)).toBe(false);
  });

  it("treats an absent or blank title as a placeholder", () => {
    // Contentful requires the field, so this is unreachable through the CMS —
    // but a cached payload from before `title` was queried carries neither,
    // and the caller must not then announce an empty alt as though it were
    // deliberate.
    expect(isPlaceholderTitle(undefined)).toBe(true);
    expect(isPlaceholderTitle(null)).toBe(true);
    expect(isPlaceholderTitle("   ")).toBe(true);
  });

  it("needs no filename to catch generator output", () => {
    // Assets uploaded straight from an image generator often have a title that
    // matches nothing, because the filename was renamed on the way in.
    expect(
      isPlaceholderTitle("Gemini Generated Image abc", "holiday.jpg"),
    ).toBe(true);
  });

  it("does not flag a description that merely mentions a screenshot", () => {
    // The narrowest case, and the one that decides the prefix list: the
    // century in "screenshot 20" is what separates the tool's own filename
    // from a sentence about what the image shows.
    expect(isPlaceholderTitle("A screenshot of the sprite editor")).toBe(false);
  });
});

describe("filenameStem", () => {
  it("removes only the final extension", () => {
    expect(filenameStem("wages.jpg")).toBe("wages");
    expect(filenameStem("Trippy_Robot.jpg.png")).toBe("Trippy_Robot.jpg");
    expect(filenameStem("no-extension")).toBe("no-extension");
  });
});
