"use client";

import { useEffect } from "react";

// Sidenote toggles are checkboxes (see lib/sidenote.tsx), which the HTML spec
// activates with Space and not Enter — outside a form, Enter on a checkbox does
// nothing at all. Every other control on the site answers to Enter, so a reader
// who reaches for it on a note marker gets silence.
//
// This restores Enter as a pure enhancement: Space already works with no
// JavaScript at all, and that baseline is the whole point of the checkbox, so
// nothing here is load-bearing. With scripts off the note still opens.
//
// Delegated from the document rather than bound per note, so lib/sidenote.tsx
// stays a server component. Handling the key on the input itself would drag the
// whole sidenote tree back into the client bundle to buy one key.
//
// Mounted by the post page alone. Sidenotes are inline entries, and only a
// post's body queries those, so no other route has a checkbox to listen for.
export default function SidenoteEnterKey() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;

      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) ||
        !target.classList.contains("sidenote-checkbox")
      ) {
        return;
      }

      // Enter would otherwise be swallowed with no effect; there is no form
      // here to submit, so nothing else wants it.
      event.preventDefault();
      target.checked = !target.checked;
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
