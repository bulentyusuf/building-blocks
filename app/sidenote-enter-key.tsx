"use client";

import { useEffect } from "react";

// Checkboxes open on Space, not Enter; this adds Enter as a pure enhancement.
// Delegated from the document so lib/sidenote.tsx stays a server component.
// [→ `sidenotes`]
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

      event.preventDefault();
      target.checked = !target.checked;
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
