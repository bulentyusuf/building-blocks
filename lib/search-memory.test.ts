import { describe, it, expect } from "vitest";
import {
  STORAGE_KEY,
  cameBack,
  rememberSearches,
  restoreSearch,
  tabStorage,
  type PagefindInstance,
  type TermStorage,
} from "./search-memory";

// A stand-in for Pagefind's instance: records searches, and lets the test fire
// the "search" event the way typing in the input does.
function fakeInstance() {
  const searches: string[] = [];
  let listener: ((term: string) => void) | undefined;
  const instance: PagefindInstance = {
    triggerSearch: (term) => searches.push(term),
    on: (_event, callback) => {
      listener = callback;
    },
  };
  return { instance, searches, type: (term: string) => listener?.(term) };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: TermStorage = {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
  return { storage, data };
}

const throwing: TermStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

const SEARCH = "https://beuseful.net/search";

describe("cameBack", () => {
  it("is true for Back, Forward or a reload of /search", () => {
    expect(cameBack({ type: "back_forward", name: SEARCH }, SEARCH)).toBe(true);
    expect(cameBack({ type: "reload", name: SEARCH }, SEARCH)).toBe(true);
  });

  it("is false for a fresh visit, or a load that landed elsewhere first", () => {
    expect(cameBack({ type: "navigate", name: SEARCH }, SEARCH)).toBe(false);
    expect(cameBack(undefined, SEARCH)).toBe(false);
    // Back onto a post, then a client-side hop to /search: not a return to
    // the search, so it starts empty.
    expect(
      cameBack(
        { type: "back_forward", name: "https://beuseful.net/posts/x" },
        SEARCH,
      ),
    ).toBe(false);
  });
});

describe("rememberSearches", () => {
  it("keeps the latest term and forgets it when the input is cleared", () => {
    const { instance, type } = fakeInstance();
    const { storage, data } = fakeStorage();
    rememberSearches(instance, storage);

    type("accessibility");
    expect(data[STORAGE_KEY]).toBe("accessibility");
    type("  ");
    expect(STORAGE_KEY in data).toBe(false);
  });

  it("does not throw when storage refuses", () => {
    const { instance, type } = fakeInstance();
    rememberSearches(instance, throwing);
    expect(() => type("dark mode")).not.toThrow();
    rememberSearches(fakeInstance().instance, null);
  });
});

describe("restoreSearch", () => {
  it("runs the remembered term", () => {
    const { instance, searches } = fakeInstance();
    restoreSearch(
      instance,
      fakeStorage({ [STORAGE_KEY]: "dark mode" }).storage,
    );
    expect(searches).toEqual(["dark mode"]);
  });

  it("does nothing when nothing is remembered or storage refuses", () => {
    for (const storage of [fakeStorage().storage, throwing, null]) {
      const { instance, searches } = fakeInstance();
      restoreSearch(instance, storage);
      expect(searches).toEqual([]);
    }
  });
});

describe("tabStorage", () => {
  it("returns null when reading sessionStorage throws", () => {
    const win = {
      get sessionStorage(): Storage {
        throw new Error("SecurityError");
      },
    };
    expect(tabStorage(win)).toBeNull();
  });
});
