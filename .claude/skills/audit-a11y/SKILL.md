---
name: audit-a11y
description: Audit beuseful.net for accessibility defects nobody has anticipated, by running axe and a reflow check in a real browser against the deployed site. Use on "audit a11y", "accessibility audit", or before a release.
disable-model-invocation: true
context: fork
background: false
argument-hint: "[a route to narrow the audit to, optional]"
---

# Accessibility audit

This is not a checklist. Nothing below lists a defect to look for. The script
measures the rendered page and the findings are whatever it reports, including
kinds of defect nobody thought to anticipate.

The report is only as good as the instrument, so prove the instrument first.

## Run it

```bash
npm run audit:a11y -- --self-test
npm run audit:a11y
```

The self test plants an image with no alt text and an empty link on a real page
and asserts axe reports both, then asserts axe stays silent on ordinary markup.
**A clean report and a silent axe are indistinguishable from the outside**, so a
report with no findings means nothing until the self test has passed.

The audit covers one route per page shape by default. `--all` covers every URL
in the deployed sitemap, and `--route /posts/some-slug` narrows to one. Routes
come from the sitemap rather than a list, so a route that ships without anyone
adding it here is still audited.

Each page is measured three times: 1280px wide, 375px wide, and 375px wide at a
20px root font size. The last is the size the author reads at, and rem-based
layout gives way there first.

`SITE_URL` points it at another origin. `CHROME_PATH` names a browser when the
installed Google Chrome is not the one to use.

## What it can see that the test suite cannot

`app/a11y.test.tsx` runs axe under jsdom, which computes no boxes and applies no
stylesheet. So that suite can check neither colour contrast nor target size, and
it can never see a page scroll sideways. This runs a real engine with real
layout, which is the whole reason it exists.

Contrast in particular: `lib/palette-contrast.test.ts` recomputes ratios from
the stylesheet, so it covers the palette and nothing that arrives with a colour
of its own. Syntax highlighting is the obvious gap and it is not the only one.

## What it still cannot see

Say so in the report rather than implying coverage that does not exist.

- Whether alt text is _accurate_. Present and non-empty is all a machine gets.
- Whether the reading order makes sense, as opposed to matching the visual order.
- Whether a keyboard path is sensible, as opposed to complete.
- Anything behind an interaction the script never performs. It loads a page and
  measures it. Menus, dialogs and the search results list are not exercised.

## Reading the report

A **REFLOW** line means the page scrolls sideways at that width, which is WCAG
1.4.10. The element named is the one the script proved responsible by hiding
subtrees and re-measuring, not the widest thing on the page. Those differ more
often than not: an element whose box runs past the viewport is frequently
clipped by an ancestor and costs nothing, while the real cause is often text
overflowing a box of ordinary width.

An **axe line** gives the rule, the impact, how many elements failed and the
first one. Where axe states a measured value, quote it.

## What to do with a finding

1. Reproduce it with `--route`, so the fix has something to prove itself against.
2. Decide whether it is a defect. The threat model, the page's purpose and
   `docs/decisions.md` all bear on that. Say plainly when the answer is no.
3. Fix it.
4. Record the reasoning in `docs/decisions.md` under its own key.
5. **Add a test that fails without the fix.** Wherever the defect is visible
   without layout, that test belongs in the suite and this audit should never
   have to find it again.

Step 5 is what stops this turning back into a checklist. A defect this audit has
found twice is a test nobody wrote.

## Settled decisions

`docs/decisions.md` records what has already been argued, and it is context
rather than a boundary. Read the entry before disagreeing with it, and re-raise
a settled call only on new evidence: a measurement nobody had, a standard that
has changed, or code that has moved underneath it. Cite the key and give the
number.

An entry that settled a question on other grounds has not settled this one. A
theme chosen for its bundle weight was not chosen for its contrast.

## Reporting

- Give measured values with units. "3.43:1, where AA wants 4.5:1", never "low
  contrast". "Scrolls 108px sideways in a 375px viewport", never "overflows".
- Name the route and the pass a finding appeared in. A defect that shows only at
  20px is a different report from one that shows everywhere.
- Group by cause, not by route. Nine routes failing for one reason is one
  finding with nine instances.
- Say which findings you could not attribute. The script reports when no single
  element accounts for an overflow, and that is information, not a gap to paper
  over.

End the report at the findings. No summary and no encouragement.
