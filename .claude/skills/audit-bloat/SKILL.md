---
name: audit-bloat
description: Audit beuseful.net for bloat in CLAUDE.md, docs/decisions.md, source comments, tests and the dependency list, and propose what to move or cut. Use on "audit bloat", "bloat check", or when CLAUDE.md nears its line budget.
disable-model-invocation: true
context: fork
background: false
argument-hint: "[paths to narrow the audit, optional]"
---

# Bloat audit

The other four audits look for things that broke. This one looks for text and
code that should not be there, which makes it the only audit whose findings
remove things. `CLAUDE.md` opens by calling bloat the default failure mode, and
that applies to its own prose as much as to the code.

Keep the report shorter than the other audits. A long report about bloat is the
defect it describes.

## Read first

1. `CLAUDE.md`, the section headed "Bloat is the default failure mode", and the
   paragraph under the title about the line budget.
2. `docs/decisions.md`, the entries keyed `reviewed-items`,
   `reopening-decisions`, `known-bad-controls` and `tailwind-scanning`.
3. Nothing else before measuring. Read files as the measurements point at them.

## Measure

Prove the duplication detector first, then run it. From the repository root:

```bash
node .claude/skills/audit-bloat/measure.mjs --self-test
node .claude/skills/audit-bloat/measure.mjs
```

The self test lifts real text from `docs/decisions.md` and asserts it is found,
and asserts that invented text is not. If it fails, stop, because every
duplication figure after it is meaningless.

The report gives the `CLAUDE.md` budget, its longest rules, the longest
decision entries, which source files share eight-word runs with the
documentation, the longest comment blocks, comment lines that narrate earlier
behaviour, and the runtime dependency count. Numbers only. The rest of this
file is how to read them.

## Checklist

### 1. The budget

`CLAUDE.md` has a budget of 280 lines, enforced by
`lib/docs-consistency.test.ts`. The file says what to do when it is tight:
move the prose, never raise the number, because growing the number instead of
moving the prose defeats the mechanism.

A rule of five lines or more is the first suspect. It is usually carrying
argument that belongs in its decision entry, which is the shape PR #537 removed
from four rules at once. Propose the short rule and the `[→ key]` marker, and
say which sentences move.

### 2. One argument, one home

The same argument should be written out in full exactly once. The other place
cites it.

`docs/decisions.md` already decides the home in several entries, saying a named
file "carries the full argument" — `next.config.js`, `app/wide-page.tsx`,
`lib/tags.ts` and `lib/constants.ts` among them. Where it does, the file is the
home and the entry should state the decision and point at it. Where it does not,
the entry is the home and the comment should say what the code does and cite the
key.

**Both carrying it in full is the defect.** The measure's duplication table is
where it shows up. A file sharing dozens of eight-word runs with
`docs/decisions.md` is usually a comment restating its entry rather than
citing it. Quote the shared run, name the home, and propose the cut on the other
side.

### 3. Long decision entries

Length alone is not a finding. `wide-page-shell` is long because it records a
real sequence of decisions. What makes an entry bloated is narrative about
attempts that no longer bears on the decision, retold at the length it took to
live through.

Condense rather than delete. Keep the key, the decision, the reason, and any
reversal marker with one paragraph of why it reversed. Reopening a call is done
in writing, so the record of a reversal is load-bearing even when the story
around it is not.

**Never propose removing an entry outright.** Its key is cited from `CLAUDE.md`,
indexed at the top of the file, and held in both directions by
`lib/docs-consistency.test.ts`. Removing one is a three-place change and a
decision in its own right.

### 4. History in code comments

A comment describing code that no longer exists is doing one of two jobs.

- **Stopping a regression.** "Do not restore the button, it announced an
  affordance that did nothing with scripts off." Keep it. It is the only thing
  between the next edit and the old defect.
- **Narrating.** "This used to be a separate component." Cut it. Version control
  holds history, and a comment is read on every future visit to the file.

This repo has a measured cost for the second kind beyond reading time. A
sentence naming a utility that markup no longer uses still generates that rule,
which is how fifteen unused utilities came to ship before PR #515. Any narrating
comment that names a literal utility is a finding with a byte cost attached.

### 5. Code

Apply the four tests in the bloat section of `CLAUDE.md` to whatever changed
since the last audit, or to the paths given as `$1`. Prefer the platform. Count
the duplication before abstracting it. A helper is justified by the decision it
removes, not the lines. No machinery for a problem that has not happened.

Check the runtime dependency count against the number `CLAUDE.md` states. A
mismatch means either a dependency arrived without the argument the file asks
for, or the stated number drifted. Both are findings, and they are different
ones.

## Reporting

- For every proposed cut, give the words or lines it saves, measured, and where
  the surviving copy lives. A cut with no stated destination is a deletion and
  needs a stronger case.
- Group findings by the five sections above, in that order.
- Say plainly when a section found nothing. An empty section is information.

## Do not raise

- **Accounts of retired test assertions** in `lib/palette-contrast.test.ts` and
  `lib/listing-rhythm.test.ts` that explain why a guard was removed. They are
  the reason several guards look the way they do. Verbatim restatements of a
  decision entry inside those files are fair game. The account of what was
  retired is not.
- **Reversal markers** and their one-paragraph reason, anywhere.
- **Duplication recorded as deliberate.** Brand colour in both the stylesheet and
  `lib/constants.ts`, the separate display and UI font tokens, and the hairline
  and control-edge border tokens. Each has an entry saying why there are two.
- **Ordinary English in comments** that happens to share a name with a utility.
  `tailwind-scanning` settles that as not worth contorting prose over.
- **Raising the budget in `CLAUDE.md`.** The file forbids it by name.
- **File length on its own.** A long file with no repetition and no dead
  narration is a long file.

End at the findings. No summary and no encouragement.
