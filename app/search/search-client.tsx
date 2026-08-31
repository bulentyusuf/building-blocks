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
// {{+ +}} raw, {{#if}}/{{#each … as …}} blocks, `|` filters). It is a static
// string we author — no user input — so injecting it as HTML is safe. House
// list idiom (matching more-stories and archive): display-face title, ink link that
// goes crimson on hover, body excerpt, heading-scoped sub-results. The main
// link must be an <a> for the components' keyboard navigation. `meta.url` is
// read first so the clean route from data-pagefind-meta wins over Pagefind's
// `.html` file path; `{{+ excerpt +}}` keeps the <mark> highlights.
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
    //
    // The handler cannot go on that <script>, and this is a hard React rule
    // rather than a preference: isHostHoistableType refuses to hoist a script
    // carrying onLoad or onError, so an inline handler would silently put the
    // module back after hydration and undo the whole change. Hence a second
    // element for the listener.
    //
    // It costs no request. A module URL is fetched and evaluated once per
    // document, so this resolves against the same module-map entry the hoisted
    // script created and fires load or error off it. The index only exists
    // after a production build, so on `next dev` it errors, which is what the
    // fallback below is for.
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
      {/* Hoisted into <head> by React rather than appended after hydration.
          Both files are a build-time static bundle emitted into
          public/pagefind/ by `postbuild`, not an npm package — loading the
          build's own copy (rather than @pagefind/component-ui) is what
          guarantees they match the CLI version that wrote the index.

          They used to be created in the effect below, which meant nothing
          about search existed in the server HTML and the critical path was
          hydrate, then module, then Pagefind's core, then the WASM, then the
          index: four sequential round-trips before the input did anything,
          with the stylesheet landing after first paint and reflowing what was
          already on screen. In <head> the browser starts both during the
          initial parse, so the module and the CSS overlap hydration instead of
          following it.

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
      {/* The result template is a static, self-authored string (see
          RESULT_TEMPLATE) injected as the element's only child; there is no
          user input, so dangerouslySetInnerHTML is safe here. */}
      <pagefind-results dangerouslySetInnerHTML={{ __html: RESULT_TEMPLATE }} />
    </div>
  );
}
