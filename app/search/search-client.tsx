"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

// Pagefind's Component UI ships as web components that are not known to JSX.
// Declare the three we use so TSX accepts them. React 19 keeps JSX types under
// the react module, so augment there rather than the deprecated global.
type CustomElement<E = unknown> = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> &
  E;
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "pagefind-config": CustomElement<{ "excerpt-length"?: string }>;
      "pagefind-input": CustomElement<{ placeholder?: string }>;
      "pagefind-summary": CustomElement;
      "pagefind-results": CustomElement;
    }
  }
}

// Custom result template in Pagefind's template syntax ({{ }} escaped,
// {{+ +}} raw, {{#if}}/{{#each … as …}} blocks, `|` filters). [→ `reviewed-items`]
// House list idiom (matching more-stories and archive). The main link must be
// an <a> for the components' keyboard navigation. `meta.url` is read first so
// the clean route from data-pagefind-meta wins over Pagefind's `.html` file
// path.
const RESULT_TEMPLATE = `
<script type="text/pagefind-template">
  <li class="result-item py-6">
    <p class="font-display text-2xl font-bold leading-tight">
      <a class="result-link text-brand-dark transition-colors duration-200 hover:text-brand-crimson" href="{{ meta.url | default(url) | safeUrl }}">{{ meta.title | default("Untitled") }}</a>
    </p>
    {{#if excerpt}}
    <p class="mt-2 leading-relaxed text-brand-dark">{{+ excerpt +}}</p>
    {{/if}}
    {{#if sub_results}}
    <ul class="mt-3 space-y-3 pl-4">
      {{#each sub_results as sub}}
      <li>
        <p class="font-display text-lg font-bold leading-tight">
          <span aria-hidden="true" class="mr-2 font-normal text-brand-muted">↳</span><a class="text-brand-dark transition-colors duration-200 hover:text-brand-crimson" href="{{ sub.url | safeUrl }}">{{ sub.title }}</a>
        </p>
        <p class="mt-1 leading-relaxed text-brand-dark">{{+ sub.excerpt +}}</p>
      </li>
      {{/each}}
    </ul>
    {{/if}}
  </li>
</script>
`;

export default function SearchClient() {
  const [failed, setFailed] = useState(false);
  // Guard against React strict mode double-invoking the effect in dev.
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Failure detection only; the loading itself is the hoisted pair below.
    // The handler cannot go on that <script>: React's isHostHoistableType
    // refuses to hoist a script carrying onLoad or onError, so an inline
    // handler would silently put the module back after hydration. Hence a
    // second element for the listener — it costs no request, since a module
    // URL is fetched and evaluated once per document and this resolves
    // against the same module-map entry the hoisted script created. The
    // index only exists after a production build, so on `next dev` it
    // errors, which is what the fallback below is for.
    const probe = document.createElement("script");
    probe.type = "module";
    probe.src = "/pagefind/pagefind-component-ui.js";
    probe.onerror = () => setFailed(true);
    document.body.appendChild(probe);

    return () => {
      probe.remove();
    };
  }, []);

  if (failed) {
    return (
      <p className="text-brand-muted">
        Search is unavailable. The index is generated at build time, so it does
        not exist on the dev server until a production build has run.
      </p>
    );
  }

  return (
    <div className="pagefind-scope">
      {/* Hoisted into <head> by React rather than appended after hydration:
          the browser starts both the module and the CSS during the initial
          parse instead of after a hydrate-then-fetch chain. Do not move
          these into the effect below — that reintroduces four sequential
          round-trips before the input does anything, with the stylesheet
          landing after first paint and reflowing what's on screen.

          Both files are a build-time static bundle emitted into
          public/pagefind/ by `postbuild`, not an npm package — loading the
          build's own copy (rather than @pagefind/component-ui) is what
          guarantees they match the CLI version that wrote the index.

          precedence is what makes React hoist and dedupe the stylesheet, and
          it must be present or the element renders in place as ordinary
          markup. The <script> is deduped by src. */}
      <link
        rel="stylesheet"
        href="/pagefind/pagefind-component-ui.css"
        precedence="default"
      />
      <script type="module" src="/pagefind/pagefind-component-ui.js" async />
      <pagefind-config excerpt-length="30"></pagefind-config>
      <pagefind-input placeholder="What are you looking for?"></pagefind-input>
      {/* Result count / no-results line ("N results for X" / "No results for
          X"). The component fills the text; globals.css styles it and hides it
          while the input is empty. */}
      <pagefind-summary></pagefind-summary>
      {/* RESULT_TEMPLATE, static and self-authored. [→ `reviewed-items`] */}
      <pagefind-results dangerouslySetInnerHTML={{ __html: RESULT_TEMPLATE }} />
    </div>
  );
}
