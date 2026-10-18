---
name: pr-review
description: Review an open pull request against CLAUDE.md, docs/decisions.md and the comments in the files it touches, keep only high-confidence findings, and post them as one PR comment. Use on "review this PR", "code review", or after opening a PR and before stopping.
argument-hint: "[PR number]"
allowed-tools: Bash(gh api:*), Bash(git log:*), Bash(git blame:*), Bash(git fetch:*), Bash(git rev-parse:*), Write
---

# Code review

Review one pull request and post the result as a single comment. Report the
comment link and stop. Do not push fixes, even for findings you are sure of.
The author decides what to act on.

Adapted from the `code-review` plugin in
github.com/anthropics/claude-plugins-official under the Apache License 2.0
(copy in this folder). Changed for this repo: it reads the decisions doc, talks
to GitHub through the REST API only, and never fixes what it finds.

## GitHub access

Use `gh api` for every GitHub call. GraphQL is blocked in cloud sessions, and
the `gh pr` subcommands go through it, so they can fail here.

- The PR: `gh api repos/bulentyusuf/building-blocks/pulls/<n>`
- Changed files: `gh api --paginate repos/bulentyusuf/building-blocks/pulls/<n>/files`
- The diff: `gh api -H "Accept: application/vnd.github.diff" repos/bulentyusuf/building-blocks/pulls/<n>`
- Existing comments: `gh api --paginate repos/bulentyusuf/building-blocks/issues/<n>/comments`
- Post the review: write it to a scratch file, then
  `gh api repos/bulentyusuf/building-blocks/issues/<n>/comments -F body=@<file>`

If the clone is shallow, run `git fetch --unshallow` before any `git blame` or
`git log` step, or the history agent sees one commit.

## Steps

Make a todo list first, then follow these in order.

1. **Eligibility.** With a Haiku agent, check whether the PR is closed, is a
   draft, or already carries a comment headed "Code review" that names the
   PR's current head SHA. If any is true, stop and say which. A "Code review"
   comment naming an older SHA does not block a new review.
2. **Guidance.** Read `CLAUDE.md` and the index at the top of
   `docs/decisions.md`. Note which decision entries the changed files could
   touch, and read those entries in full. `CLAUDE.md` carries the rules, the
   decisions doc carries why, and a change that matches a settled decision is
   not a finding.
3. **Summary.** Read the PR's `head.sha` once and keep it. Every link and the
   comment's first line use this SHA, never a fresh read. With a Haiku agent,
   read the PR and return a short summary of the change.
4. **Review.** Launch five Sonnet agents in parallel. Each returns a list of
   issues with the reason each was flagged.
   1. Check the change against `CLAUDE.md` and the decision entries from step 2. `CLAUDE.md` is written for Claude as it writes code, so not every
      rule applies to a review.
   2. Read only the changed lines and scan for obvious bugs. Large bugs only,
      no nitpicks, no likely false positives.
   3. Read the git blame and history of the modified code, and look for bugs
      that history makes visible.
   4. Read earlier PRs that touched these files, and check whether any review
      comment on them applies here too.
   5. Read the code comments in the modified files, including any `[→ key]`
      pointer to a decision entry, and check the change honours them.
5. **Scoring.** For each issue, launch a parallel Haiku agent with the PR, the
   issue and the guidance from step 2. It scores the issue from 0 to 100. For
   an issue flagged against `CLAUDE.md` or a decision entry, it confirms the
   text really says so. Give it this scale word for word.
   - 0: Not confident at all. A false positive that does not survive light
     scrutiny, or a pre-existing issue.
   - 25: Somewhat confident. Might be real, might not, and the agent could not
     verify it. If stylistic, not something the guidance names.
   - 50: Moderately confident. Verified as real, but a nitpick or rare in
     practice. Not important relative to the rest of the PR.
   - 75: Highly confident. Double-checked and very likely to be hit in
     practice, or named directly in the guidance. The PR's approach is
     insufficient.
   - 100: Absolutely certain. Double-checked, definitely real, and will happen
     often. The evidence confirms it directly.
6. **Filter.** Drop every issue below 80.
7. **Recheck.** Repeat the eligibility check from step 1, in case the PR
   changed state while the review ran.
8. **Post.** Post one comment in the format below, whether or not anything
   survived the filter, then report the comment's link and stop.

## Not findings

- Pre-existing issues, and real issues on lines the PR did not change
- Anything `docs/decisions.md` has already settled
- Anything the typechecker, test suite, formatter or build would catch. CI
  runs all of them, so do not run them yourself.
- General quality points such as test coverage or documentation, unless the
  guidance requires them
- Pedantic nitpicks a senior engineer would not raise
- Changes in behaviour that are plainly the point of the PR

## Comment format

The first line names the head SHA captured in step 3, which is what step 1
checks on a later run. Keep it brief, no emojis. Cite every finding with a
link to the file and line range at that same SHA.
A link built with `$(git rev-parse HEAD)` does not render, because the comment
is Markdown, not a shell. Give at least one line of context either side, for
example `#L4-L7` for an issue on lines 5 and 6.

With findings:

```
### Code review of <full sha>

Found 2 issues:

1. <what is wrong> (CLAUDE.md says "<...>")

https://github.com/bulentyusuf/building-blocks/blob/<full sha>/<path>#L<start>-L<end>

2. <what is wrong> (bug, because <file and code>)

https://github.com/bulentyusuf/building-blocks/blob/<full sha>/<path>#L<start>-L<end>
```

Without:

```
### Code review of <full sha>

No issues found. Checked for bugs, CLAUDE.md and decisions compliance, and the
guidance in code comments.
```
