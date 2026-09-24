import NewWindowHint from "@/app/new-window-hint";
import type { Block, Inline } from "@contentful/rich-text-types";
import type { ReactNode } from "react";
import { SITE_HOSTNAME } from "./constants";

// Protocol-relative forms start with a slash but leave the site, so they fall
// through to URL parsing, which rejects them. Root-relative paths must be
// caught here first, because URL parsing without a base throws on them.
function isRootRelative(url: string): boolean {
  return url.startsWith("/") && url[1] !== "/" && url[1] !== "\\";
}

function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return !(
      hostname === SITE_HOSTNAME || hostname.endsWith(`.${SITE_HOSTNAME}`)
    );
  } catch {
    return false;
  }
}

// The one hyperlink renderer for every rich-text field. [→ `rich-text-links`]
export function renderHyperlink(node: Block | Inline, children: ReactNode) {
  const uri: unknown = (node as Inline).data.uri;
  if (typeof uri !== "string") return <>{children}</>;

  if (isRootRelative(uri)) return <a href={uri}>{children}</a>;

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return <>{children}</>;
  }

  // A mail client, not a window: no target or new-window hint.
  if (parsed.protocol === "mailto:") return <a href={uri}>{children}</a>;

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return <>{children}</>;
  }

  if (isExternalUrl(uri)) {
    return (
      <a href={uri} target="_blank" rel="noopener noreferrer">
        {children}
        <NewWindowHint />
      </a>
    );
  }
  return <a href={uri}>{children}</a>;
}
