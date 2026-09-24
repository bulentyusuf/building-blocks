"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

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
// keyboard handling. meta.url wins over the .html path. [→ `reviewed-items`]
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
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Failure detection only. React will not hoist a script carrying onError,
    // so a second element listens; same module URL, so no extra request.
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
      {/* Hoisted by React so the module and CSS start during the first parse.
          Loaded from the build's own public/pagefind/, so they match the index.
          `precedence` is what makes React hoist the stylesheet. */}
      <link
        rel="stylesheet"
        href="/pagefind/pagefind-component-ui.css"
        precedence="default"
      />
      <script type="module" src="/pagefind/pagefind-component-ui.js" async />
      <pagefind-config excerpt-length="30"></pagefind-config>
      <pagefind-input placeholder="What are you looking for?"></pagefind-input>
      {/* Hidden by globals.css while the input is empty. */}
      <pagefind-summary></pagefind-summary>
      {/* [→ `reviewed-items`] */}
      <pagefind-results dangerouslySetInnerHTML={{ __html: RESULT_TEMPLATE }} />
    </div>
  );
}
