import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import { config, proxy } from "@/proxy";

// Next compiles a `has` value as ^value$ (prepare-destination.js, matchHas),
// so this is the test the platform applies before the proxy is invoked.
const invokes = (userAgent: string) =>
  new RegExp(`^${config.matcher[0].has[0].value}$`).test(userAgent);

// User agents as logged by Vercel on 25 September 2026, verbatim.
const CHATGPT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot";
const CLAUDEBOT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)";
const AMAZONBOT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot) Chrome/119.0.6045.214 Safari/537.36";
const META =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))";
const READER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const SCRAPER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.3";
const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

describe("the proxy matcher", () => {
  it.each([CHATGPT, CLAUDEBOT, AMAZONBOT, META, "Google"])(
    "invokes the proxy for %s",
    (ua) => expect(invokes(ua)).toBe(true),
  );

  // Known-bad controls: readers, undeclared scrapers, search crawlers, and a
  // string that merely ends in "Google" must all bypass the proxy.
  it.each([READER, SCRAPER, GOOGLEBOT, "Something Google", "google", ""])(
    "does not invoke the proxy for %s",
    (ua) => expect(invokes(ua)).toBe(false),
  );
});

describe("what the proxy sends", () => {
  const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(new Response()),
  );

  const run = (userAgent: string) => {
    const waitUntil = vi.fn();
    const request = new NextRequest(
      "https://beuseful.net/posts/standing-agent-instructions-bloat?utm=x",
      { headers: { "user-agent": userAgent } },
    );
    proxy(request, { waitUntil } as unknown as NextFetchEvent);
    return waitUntil;
  };

  const sentBody = () =>
    JSON.parse(fetchMock.mock.calls[0]?.[1].body as string);

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubEnv("VERCEL_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockClear();
  });

  it("sends one anonymous event naming the agent and the path", () => {
    expect(run(CHATGPT)).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://eu.i.posthog.com/i/v0/e/",
    );
    expect(sentBody()).toEqual({
      api_key: "phc_test",
      event: "ai_agent_request",
      distinct_id: "ai-agent:ChatGPT-User",
      properties: {
        $process_person_profile: false,
        agent: "ChatGPT-User",
        path: "/posts/standing-agent-instructions-bloat",
        user_agent: CHATGPT,
      },
    });
  });

  it("names a bare Google fetch", () => {
    run("Google");
    expect(sentBody().properties.agent).toBe("Google");
  });

  it("sends nothing for a reader", () => {
    expect(run(READER)).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing without a token", () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "");
    expect(run(CHATGPT)).not.toHaveBeenCalled();
  });

  it("sends nothing outside production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(run(CHATGPT)).not.toHaveBeenCalled();
  });
});
