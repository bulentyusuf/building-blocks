// Remembers the search term in this tab only, so Back from a result brings the
// search back. Never in the address: from there it would reach request logs,
// analytics and Referer headers, and the privacy notice promises the words
// stay in the browser. [→ `pagefind-ui`]

export const STORAGE_KEY = "search-term";

/** The slice of a Pagefind Component UI instance this uses. */
export type PagefindInstance = {
  triggerSearch: (term: string) => void;
  on: (event: "search", callback: (term: string) => void) => void;
};

export type TermStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** sessionStorage, or null where the browser refuses it. */
export function tabStorage(win: {
  readonly sessionStorage: Storage;
}): TermStorage | null {
  try {
    return win.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * True when this document was reached by Back, Forward or a reload of this
 * same page. A fresh visit starts empty, as before.
 */
export function cameBack(
  entry: { type: string; name: string } | undefined,
  href: string,
): boolean {
  if (!entry || (entry.type !== "back_forward" && entry.type !== "reload")) {
    return false;
  }
  return new URL(entry.name).pathname === new URL(href).pathname;
}

/** Keeps the latest term, and forgets it when the input is cleared. */
export function rememberSearches(
  instance: PagefindInstance,
  storage: TermStorage | null,
): void {
  instance.on("search", (term) => {
    try {
      if (term.trim()) storage?.setItem(STORAGE_KEY, term);
      else storage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage full or blocked: search still works, Back just starts empty.
    }
  });
}

/** Runs the remembered search, if there is one. */
export function restoreSearch(
  instance: PagefindInstance,
  storage: TermStorage | null,
): void {
  let term: string | null = null;
  try {
    term = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return;
  }
  if (term?.trim()) instance.triggerSearch(term);
}
