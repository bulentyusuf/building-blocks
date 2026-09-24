"use client";

import { useEffect, useState } from "react";

export default function CopyButton({
  code,
  label = "code",
  variant = "light",
}: {
  code: string;
  label?: string;
  variant?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  // Gated on mount: with scripts off the button would announce and do nothing.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const noun = label.charAt(0).toUpperCase() + label.slice(1);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; fail quietly.
    }
  }

  const variantStyles =
    variant === "dark"
      ? // On the crimson prompt header. Dark mode flips to dark ink, because
        // white fails AA on the lifted crimson. Edges clear 3:1.
        "border border-white/60 bg-white/10 text-white hover:border-white/80 hover:bg-white/20 dark:border-surface-dark/70 dark:bg-white/10 dark:text-surface-dark dark:hover:border-surface-dark/70 dark:hover:bg-white/20"
      : // On the filename bar or over code. Edges clear 3:1; the dark hover pins
        // the ink light so the control brightens rather than recedes.
        "border border-gray-500 bg-white text-gray-600 hover:border-gray-600 hover:text-gray-900 dark:border-white/40 dark:bg-white/10 dark:text-brand-dark dark:hover:border-white/60 dark:hover:bg-white/20 dark:hover:text-brand-dark";

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={copy}
        // Tracks the visible text, so a speech user can say "click Copied"
        // (WCAG 2.5.3).
        aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
        className={`rounded-md px-2 py-1 font-mono text-xs transition-colors ${variantStyles}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${noun} copied to clipboard` : ""}
      </span>
    </>
  );
}
