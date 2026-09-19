---
name: stage-post
description: Stage a finished draft into Contentful as an unpublished Post entry, with the field names, caps and connector limits this space actually has. Use on "stage this post", "put this in Contentful", "create the entry", or before any hand-off to publishing.
disable-model-invocation: true
argument-hint: "[draft file or post slug]"
---

# Stage a post

Create or update a Post entry from a finished draft, and stop at publishing.

**This skill deliberately does not run in a forked subagent**, unlike the audit
skills beside it. Those read and report. This one writes to a live CMS, one
entry at a time, and every step wants confirmation from the person in the room.
A report arriving after the fact is the wrong shape for that.

## Before the first field

1. **Call `get_initial_context` before any other Contentful tool.** The server
   requires it and refuses everything else until it has run. It also prints the
   authorised `space:environment` pairs, the region and the bulk-operation cap,
   none of which should be assumed from memory.
2. **Read the schema from the space, not from this repo.** `list_content_types`
   then `get_content_type` for the types you are about to touch.
   `contentful/export.json` is the **template's** model, shipped for people
   forking this repo. It can and does lag the live space, and
   `docs/decisions.md` records that CI cannot compare the two. Treat the export
   as a starting point and the space as the truth.
3. **Do not assume the locale.** The live space and the template disagree on
   purpose, and `list_locales` is refused by the MCP app installation here, so
   the connector cannot tell you. Read the locale key off an existing entry with
   `get_entry` and key every field you write the same way. Guessing produces an
   entry that validates, saves, and renders nothing.
4. **Find out what the connector may do before planning around it.** Write
   permissions come from the MCP app installation in each space, not from this
   repo, so they can be narrower than the tool list suggests. Assume create and
   update work and that publishing, unpublishing, deleting, activating a type
   and asset updates do not, until a call proves otherwise. A refusal names the
   installation in its message, which is how you tell it from a validation
   failure.

## The field names are per type, and that is the trap

Five types carry the long body of something, and no two call it the same thing.

| Type         | Long field | Kind      |
| ------------ | ---------- | --------- |
| Post         | `content`  | Rich text |
| Page         | `body`     | Rich text |
| Sidenote     | `note`     | Rich text |
| Code Block   | `code`     | Text      |
| Prompt Block | `prompt`   | Text      |

Writing a Post's body to `body` is the single most likely mistake, and it does
not fail loudly. Confirm the field id from `get_content_type` before writing.

## Post checklist

Required, and the entry will not save without them: `title`, `slug`, `date`,
`coverImage`, `excerpt`, `content`, `authors`, `category`.

Optional: `updatedDate`, `tags`.

- **`slug` is unique and matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.** Lowercase,
  digits and single hyphens. No leading, trailing or doubled hyphen, no
  underscore, no trailing slash.
- **`authors` is an ordered array capped at three, and the first entry is the
  lead.** It drives the portrait stack, the on-page and card name lines, the OG
  image, and the legacy RSS author element. Reordering the array changes lead
  authorship everywhere at once. Look up the author entry IDs in the space
  rather than reusing an ID from anywhere else.
- **`tags` is capped at three.** A tag only gets its own page once at least two
  published posts carry it, so a tag used once renders as a pill that links
  nowhere until the second post lands. Tag a post as part of publishing it
  rather than afterwards.
- **`category` is a single required link.** There are few of them and the
  choice is editorial, so confirm it rather than inferring from the body.
- **`date` is display metadata, not a gate.** Nothing filters on it, so a
  published entry dated in the future goes live immediately and lands on the
  home hero, which orders by date descending. To schedule, use Contentful's
  scheduled publishing and leave the entry unpublished. Do not reach for a date
  filter in a query; `docs/decisions.md` records three separate reasons that
  makes the site worse.

## The cover image

`coverImage` is required and links an Asset.

**The asset's `title` becomes the picture's alt text.** It must describe the
image. A filename stem, a generator's output or a camera prefix is a failure
that renders as alt text on a live page, and it has happened across a whole
library at once. `lib/placeholder-title.ts` catches the obvious shapes at build
time and warns, but it answers "is this obviously not alt text", never "is this
good alt text". Only a person looking at the picture can answer the second.

Asset updates are a web-UI job here, so fixing a title is something to hand
over rather than attempt.

## Embedded entries

A post body can embed Sidenote, Code Block and Prompt Block entries, as block
or inline nodes. Each is its own entry, created first and then linked from the
rich text.

- **A Code Block's `language` must be one the highlighter loads.** The dropdown
  and the highlighter's list are two separate things, and a language the
  dropdown offers but the code cannot load renders as an unhighlighted block
  with no error anywhere. Check the current list in `lib/highlight.ts` rather
  than trusting the dropdown.
- **A Sidenote is an inline embed.** A deleted or unpublished Sidenote degrades
  to nothing rather than erroring, so a missing note is silent.
- **An unpublished linked entry comes back as `null`** in a link array, which
  is why the code reads authors through a helper that filters nulls. The same
  applies to any embed: publish the pieces before, or with, the post.

## Drafts are invisible to search

**`search_entries` does not return draft entries.** A freshly created entry
will not come back from a search for its own title, which reads exactly like
the create having failed. Keep the entry ID the create returns and use
`get_entry` with it. Re-running the create because the search came back empty
is how a space ends up with duplicates.

`create_entry` also drops out of the tool manifest from time to time. It is a
session-state problem rather than a permissions one, so toggling the connector
off and on, or starting a fresh conversation, brings it back. A permissions
refusal says so in its message; a missing tool says nothing at all.

## Stop at publishing

Staging ends with an unpublished entry and a preview link. Publishing is a
person's decision and, here, a web-UI action.

Preview a draft through the site's own draft route rather than the CMS
preview pane alone. It resolves the post in preview mode before enabling draft
mode, so an unknown slug returns 404 rather than leaving draft mode on with
nowhere to land. The Post type's preview URL is configured in the space and
takes the slug as a parameter; `README.md` carries the exact shape.

Once a person publishes, the revalidation webhook refreshes the affected pages
within seconds. Two things it does not do, both expected:

- **Search will not find the post until the next deployment.** The index is
  built by `postbuild`, not by revalidation.
- **A schema change does not travel this way at all.** If staging turned up a
  field the model lacks, that is the live space plus the repo's fixtures, in
  that order, and it is not part of staging a post.

## Do not

- Do not publish, unpublish, archive or delete through the connector.
- Do not create or edit a content type through the connector. Schema changes go
  through the web UI, and `update_content_type` is unreliable here.
- Do not create an entry against a type that has not been activated. A new type
  is always two trips, activate then populate.
- Do not rename a content type ID. Display names change freely, IDs cannot, and
  changing one means deleting and recreating the type.
- Do not write a field keyed to a locale you have not read off the space.
- Do not re-create an entry because `search_entries` cannot see it.
- Do not edit `contentful/export.json` or `contentful/seed.json` as part of
  staging. They are generated, byte-shape-sensitive and excluded from the
  formatter on purpose.

End at the entry ID and the preview link. Say what is unpublished and what the
person has to do in the web UI.
