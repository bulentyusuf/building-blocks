"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { preloadModule } from "react-dom";

// Declares the Pagefind web components for TSX, under React 19's module.
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

// House result template; the main link must be an <a> for the components'
// keyboard handling. meta.url wins over the .html path; the strand pill reads
// the post's indexed strand. [→ `reviewed-items`, `pagefind-ui`]
const RESULT_TEMPLATE = `
<script type="text/pagefind-template">
  <li class="result-item px-5 py-6 sm:px-7">
    {{#if meta.strand}}
    <span class="{{ meta.strandfill }} mb-2.5 inline-block rounded-full border-2 border-brand-dark px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-on-strand">{{ meta.strand }}</span>
    {{/if}}
    <p class="font-ui text-2xl leading-tight font-[800] md:text-[1.625rem]">
      <a class="result-link text-brand-dark transition-colors duration-200 hover:text-brand-crimson" href="{{ meta.url | default(url) | safeUrl }}">{{ meta.title | default("Untitled") }}</a>
    </p>
    {{#if excerpt}}
    <p class="mt-2 text-lg leading-relaxed text-brand-dark">{{+ excerpt +}}</p>
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

const PAGEFIND_MODULE = "/pagefind/pagefind-component-ui.js";

export default function SearchClient() {
  const [failed, setFailed] = useState(false);
  const loadedRef = useRef(false);

  // Fetched from the server HTML, run after hydration. [→ `pagefind-ui`]
  preloadModule(PAGEFIND_MODULE);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loader = document.createElement("script");
    loader.type = "module";
    loader.src = PAGEFIND_MODULE;
    loader.onerror = () => setFailed(true);
    document.body.appendChild(loader);

    return () => {
      loader.remove();
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
      {/* Hoisted by React so the CSS starts during the first parse.
          `precedence` is what makes React hoist it. */}
      <link
        rel="stylesheet"
        href="/pagefind/pagefind-component-ui.css"
        precedence="default"
      />
      <pagefind-config excerpt-length="30"></pagefind-config>
      <pagefind-input placeholder="What are you looking for?"></pagefind-input>
      {/* Hidden by globals.css while the input is empty. */}
      <pagefind-summary></pagefind-summary>
      {/* [→ `reviewed-items`] */}
      <pagefind-results dangerouslySetInnerHTML={{ __html: RESULT_TEMPLATE }} />
    </div>
  );
}
