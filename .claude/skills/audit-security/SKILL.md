---
name: audit-security
description: Run a security regression audit on beuseful.net. Checks the header, injection-sink, secret-comparison and supply-chain decisions this repo has already made, so none is undone silently. Use on "audit security", "security audit", or after a dependency bump.
disable-model-invocation: true
context: fork
background: false
argument-hint: "[paths to narrow the audit, optional]"
---

# Security audit

A regression checklist for a **trusted-CMS, single-author** site with no user
accounts, no user-generated content and no write path from the public internet.
That threat model is what makes several of the decisions below correct, and an
audit that ignores it produces findings nobody can act on.

Every item is something already argued here. The value is catching the undo.

## Read first, before checking anything

1. `docs/decisions.md`, especially the entries keyed `csp-scoping`,
   `reviewed-items`, `rich-text-links`, `node-pin`, `rich-text-types-dupe` and
   `two-spaces`. The `reviewed-items` entry is a list of things already
   reviewed and deliberately left alone; re-raising one is the most common way
   this audit wastes a reader's time.
2. The comment block at the top of `next.config.js`, which carries the full
   header argument.
3. Every file named in a check, in full.

If `$1` is given, narrow to those paths but still read the two documents.

## Checklist

### 1. Header rule order is load-bearing

Next walks header rules in array order and **a later match overwrites the same
key**, so the strict catch-all must come **first** and every relaxation wins by
following it. Inverted, the search route silently loses its WebAssembly
permission and search fails in every Chromium browser with no visible error.
That inversion shipped as a pull request once and was closed rather than fixed.

`lib/csp-headers.test.ts` resolves the config through those semantics and keeps
the inverted ordering as a known-bad control, so both relaxations are re-proven
catchable on every run. Check that control is still there and still fails when
flipped.

### 2. Exactly two relaxations, each scoped to its route

- **WebAssembly compilation** applies to the search document and its own
  subtree, plus the Pagefind asset path. The asset path is not optional:
  Pagefind compiles WASM inside a SharedWorker, and **a SharedWorker takes its
  policy from the worker script's own response headers, not from the creating
  document**.
- **Contentful in `frame-ancestors`** applies to the post route family alone.
  It sat on the catch-all until an audit asked what the preview surface
  actually is: the Post type's preview URL redirects to a post page, so one
  route family is the whole of it, and every other published page on the site
  was framable by the CMS to buy preview on that one.

  **The draft API route deliberately does not carry it.** `frame-ancestors` is
  enforced on a document that is _displayed_ in a frame, and a redirect never
  is. A rule there would be a rule that never fires.

If a CMS Page entry is ever given a preview URL of its own, that list has to
grow with it. The symptom otherwise is a framing error inside Contentful naming
nothing in this repo.

Neither relaxation may go back on the catch-all. Check both.

### 3. The standing header set

Confirm each is still present on the catch-all in `next.config.js`, and that
none has been narrowed: content-type sniffing off, a cross-origin-safe referrer
policy, HSTS with subdomains and preload, `Cross-Origin-Opener-Policy` at
`same-origin`, and a `Permissions-Policy` denying camera, microphone,
geolocation, payment, USB and the interest-cohort feature.

The opener policy is `same-origin` rather than the popup-allowing variant
because nothing here opens a popup it needs to keep talking to; every external
link is a plain new-tab navigation. It also puts the document in its own
browsing context group, which is the precondition for cross-origin isolation if
that is ever wanted.

The framework's own version header is disabled. Keep it that way.

### 4. Inventory the raw HTML sinks

Enumerate them rather than assuming the count:

```bash
grep -rn "dangerouslySetInnerHTML" app lib
```

There were five call sites in September 2026, in three known classes. The count
is not the check — **a site that falls into none of the three classes below is
the finding**, whatever the total.

- **Structured-data blocks** go through `jsonLdHtml` in `lib/json-ld.ts`, which
  escapes the three HTML-significant characters to their unicode forms beyond
  plain serialisation. Values are trusted CMS data today, so this is
  defence-in-depth — but every block must go through that helper so the
  behaviour is consistent rather than per-call-site. A block built inline is a
  finding even if its data is trusted.
- **Highlighted code** in `lib/rich-text.tsx`. Trusted CMS input, and the
  renderer allowlists URL schemes.
- **The Pagefind result template** in `app/search/search-client.tsx`, which is
  static and self-authored, and the unescaped excerpt interpolations inside it.
  That form is what preserves the match highlights; the content reaches it from
  post bodies through the build-time index, so it inherits the same trusted-CMS
  model. The surrounding interpolations are escaped and URL-filtered by
  Pagefind.

### 5. URL scheme allowlist

`lib/rich-text-link.tsx` is the only hyperlink renderer on the site. It permits
`http`, `https` and `mailto`; anything else degrades to plain text, including
scripting URLs and the protocol-relative forms.

Any new rich-text surface must pass it as the hyperlink override rather than
relying on the renderer's default, which emits the raw URI as-is. **Sidenote
bodies relied on the default once**, which let a scripting URL through in a note
while the post body rejected the same one. Do not copy the renderer to a second
location; that drift caused the gap.

```bash
grep -rn "documentToReactComponents" app lib
```

Check the overrides at every call site.

### 6. Secret comparison

`lib/secret.ts` hashes both sides to a fixed-length digest before comparing in
constant time. The hashing is not decoration: it avoids the range error the
constant-time comparison throws when two buffers differ in byte length, such as
a same-character-length secret containing a multibyte character, and it removes
the input-length leak.

Every secret check on the draft and revalidate routes must go through it. A
direct equality comparison anywhere is the finding.

There is **no rate limiting on the API routes**, deliberately: with
constant-time comparison, brute force is infeasible provided the secrets are
long and random. That proviso is the live part — confirm the configured secrets
are high-entropy rather than asserting the reasoning holds.

### 7. The sitemap cannot be injected into

`app/sitemap-xml/route.ts` filters CMS Page entries through a hardcoded set of
routed slugs, so a newly published Page cannot put a URL with no route into the
sitemap. Only two slugs are routed today. **Any new routed slug must be added to
that set**, and a slug in the set with no route is the mirror finding.

A root catch-all route was the alternative and needs collision care against the
post, category and author trees, so it was not taken.

### 8. Supply chain

- **Three overrides must stay**: postcss and sharp, which clear advisories in
  copies the framework bundles and does not update, and uuid, held back because
  the Contentful import tooling pins a chain that never picks up the line
  declaring a safe version. With them, the audit has no high findings. Do not
  remove them to "let the framework manage its own dependencies", and
  **re-check them on every framework bump** — an override silently pins a
  dependency the parent may have moved past.
- Forcing sharp is safe here because the image loader is custom, so the
  framework's optimiser never invokes it. That is also why the image
  optimisation advisories never applied.
- **There must be no committed `.npmrc` setting legacy peer resolution.** One
  existed and suppressed every peer conflict rather than the single one it was
  added for. Vercel reads that file too, so installs and deployments now fail
  loudly on an incompatible dependency instead of accepting it silently.
  Resolve the conflict; do not restore the file.
- The Node major is written once, in `engines.node`, as an **exact major**.
  Three consumers read it: Vercel selects the deployed runtime from it,
  overriding the dashboard setting; npm checks it on install; and both workflows
  resolve it through the setup action's package-file option, which reads two
  other fields **first**. Adding either of those silently takes precedence. A
  range resolves to the newest available major and upgrades production
  silently. There must be no second copy anywhere.
- `@types/node` follows the **runtime** major, not latest, or the build
  typechecks against APIs that do not exist at runtime.

Run the audit and diff it against the expectation rather than reporting raw
output:

```bash
npm audit --omit=dev
npm ls --omit=dev @contentful/rich-text-types
```

The second should show one copy. Two is the dev nesting, which is expected and
cannot be deduped.

### 9. Workflow permissions

The CI workflow declares read-only contents permission. Any workflow gaining
write permission, or gaining a step that runs code from a pull request head in
a privileged context, is the finding.

The gate is exactly three steps in this order: format check, tests, build. There
is **no separate typecheck step**, so typechecking happens inside the build — a
change that satisfies the compiler and the test suite has still not met the
gate.

## Reporting

- State the threat model a finding assumes. A finding that only bites with
  untrusted user-generated content should say so, because this site has none.
- Verify every mechanism claim by grep against the source. Do not derive
  behaviour from what the config appears to do; header semantics in particular
  are order-dependent and easy to read backwards.
- Separate **regressions** from **gaps**, and give each a concrete next check
  rather than a severity label alone.

## Do not raise

Each of these is recorded in `reviewed-items`. Read the entry before
disagreeing.

- Global `'unsafe-inline'` in the policy. Removing it needs a per-request
  nonce, which forces dynamic rendering. Revisit only if the site starts
  rendering untrusted user-generated content.
- `data:` in the image source list. It is needed for blur placeholders, and the
  MIME-scoped form once suggested is not valid policy syntax — scheme-sources
  cannot be MIME-scoped. The `blob:` that sat beside it was already audited and
  removed as unused surface.
- The absence of `X-Frame-Options`. The modern directive covers every current
  browser, so the legacy header is low-value, not a gap.
- The absence of rate limiting, subject to the secret-entropy check above.
- Dependabot ignoring major updates. Advisory-driven security updates are a
  separate mechanism and still cover security-flagged majors.
- CI actions pinned to major tags rather than commit digests. Accepted as low
  risk because they are first-party.
- The two copies of the rich-text types package. One is a nested dev copy and
  no released version of the management client accepts the other's major.

End the report at the findings. No summary and no encouragement.
