#!/usr/bin/env bash
# The Ignored Build Step for the building-blocks Vercel project. It is set in
# the dashboard rather than in vercel.json, a choice made while a second Vercel
# project also built from this repo. [→ `preview-on-request`]
#
# Exit 0 tells Vercel to skip: the deployment is marked Canceled and stores no
# output. Exit 1 tells it to build. Every path that is unsure of itself exits 1,
# because a wrong skip leaves the live site behind while a wrong build only
# costs storage.

set -u

commit_sha="${VERCEL_GIT_COMMIT_SHA:-}"
previous_sha="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ "${VERCEL_ENV:-}" = "preview" ]; then
  # Branch and pull request pushes. CI already runs the full build on every
  # pull request, so a preview adds a link and nothing more, and previews were
  # most of what filled the Hobby storage allowance.
  case "${VERCEL_GIT_COMMIT_MESSAGE:-}" in
    *"[preview]"*)
      echo "Building: this commit asks for a preview."
      exit 1
      ;;
  esac
  echo "Skipping: previews build on request. Put [preview] in a commit message to get one."
  exit 0
fi

# Production from here on, and anything Vercel did not label as a preview, which
# is treated as production so that a surprise ends in a build. It rebuilds
# whenever anything that ships has changed.

if [ -z "$previous_sha" ]; then
  echo "Building: Vercel supplied no earlier deployment to compare with."
  exit 1
fi

if [ "$previous_sha" = "$commit_sha" ]; then
  # A Redeploy or a deploy hook on the commit already live. Always deliberate,
  # usually to pick up a changed environment variable, so it always builds.
  echo "Building: this is a redeploy of the live commit."
  exit 1
fi

if ! git cat-file -e "${previous_sha}^{commit}" 2>/dev/null; then
  # Vercel clones with limited history, so an old enough comparison point may
  # not be in this checkout at all.
  echo "Building: ${previous_sha} is not in this checkout."
  exit 1
fi

# The four paths Tailwind's scan already leaves out (see the @source lines in
# app/globals.css) and that no build code reads. A change confined to them
# cannot alter a single byte of what ships. git diff exits 1 on a difference
# and above 1 on an error, and both of those fall through to a build.
if git diff --quiet "$previous_sha" HEAD -- . \
  ':(exclude)CLAUDE.md' \
  ':(exclude)README.md' \
  ':(exclude)docs' \
  ':(exclude).claude'; then
  echo "Skipping: only documentation changed since ${previous_sha}."
  exit 0
fi

echo "Building: code changed since ${previous_sha}."
exit 1
