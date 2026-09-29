import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import { config, inRange } from "@/proxy";

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

describe("inRange", () => {
  it.each([
    ["203.0.113.7", "203.0.113.0/24"],
    ["203.0.113.7", "203.0.113.7/32"],
    ["203.0.113.7", "0.0.0.0/0"],
    ["2001:db8::1", "2001:db8::/32"],
    ["2001:db8:0:0:0:0:0:1", "2001:db8::1/128"],
  ])("puts %s inside %s", (ip, cidr) => expect(inRange(ip, cidr)).toBe(true));

  // Known-bad controls: neighbours, the other address family, malformed input.
  it.each([
    ["203.0.114.7", "203.0.113.0/24"],
    ["203.0.113.8", "203.0.113.7/32"],
    ["2001:db9::1", "2001:db8::/32"],
    ["203.0.113.7", "2001:db8::/32"],
    ["2001:db8::1", "203.0.113.0/24"],
    ["203.0.113.256", "203.0.113.0/24"],
    ["2001:db8:::1", "2001:db8::/32"],
    ["not-an-ip", "203.0.113.0/24"],
    ["203.0.113.7", "203.0.113.0/33"],
  ])("keeps %s outside %s", (ip, cidr) =>
    expect(inRange(ip, cidr)).toBe(false),
  );
});

describe("what the proxy sends", () => {
  const LIST = {
    prefixes: [
      { ipv4Prefix: "203.0.113.0/24" },
      { ipv6Prefix: "2001:db8::/32" },
    ],
  };
  const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
    Promise.resolve(
      url.includes("perplexity-user")
        ? new Response("nope", { status: 500 })
        : url.endsWith(".json")
          ? Response.json(LIST)
          : new Response(),
    ),
  );

  // A fresh module per test, so the day-long list cache starts empty.
  const run = async (userAgent: string, ip = "203.0.113.7") => {
    const { proxy } = await import("@/proxy");
    const waitUntil = vi.fn();
    const request = new NextRequest(
      "https://beuseful.net/posts/standing-agent-instructions-bloat?utm=x",
      { headers: { "user-agent": userAgent, "x-forwarded-for": ip } },
    );
    proxy(request, { waitUntil } as unknown as NextFetchEvent);
    await waitUntil.mock.calls[0]?.[0];
    return waitUntil;
  };

  const posthogCalls = () =>
    fetchMock.mock.calls.filter(([url]) => url.includes("posthog"));
  const sentBody = () => JSON.parse(posthogCalls()[0]?.[1]?.body as string);

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubEnv("VERCEL_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockClear();
  });

  it("sends one anonymous event naming the agent, the path and the check", async () => {
    expect(await run(CHATGPT)).toHaveBeenCalledOnce();
    expect(posthogCalls()).toHaveLength(1);
    expect(posthogCalls()[0]?.[0]).toBe("https://eu.i.posthog.com/i/v0/e/");
    expect(sentBody()).toEqual({
      api_key: "phc_test",
      event: "ai_agent_request",
      distinct_id: "ai-agent:ChatGPT-User",
      properties: {
        $process_person_profile: false,
        agent: "ChatGPT-User",
        path: "/posts/standing-agent-instructions-bloat",
        user_agent: CHATGPT,
        verified: true,
      },
    });
  });

  it("checks against the operator's own list", async () => {
    await run(CHATGPT);
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
      "https://openai.com/chatgpt-user.json",
    );
  });

  it("never sends the IP address", async () => {
    await run(CHATGPT, "203.0.113.7");
    expect(posthogCalls()[0]?.[1]?.body).not.toContain("203.0.113.7");
  });

  it("marks an address outside the published ranges as unverified", async () => {
    await run(CHATGPT, "198.51.100.9");
    expect(sentBody().properties.verified).toBe(false);
  });

  it("verifies an IPv6 address", async () => {
    await run(CLAUDEBOT, "2001:db8::5");
    expect(sentBody().properties.verified).toBe(true);
  });

  it("sends null for an agent with no published list", async () => {
    await run(AMAZONBOT);
    expect(sentBody().properties.verified).toBeNull();
  });

  it("sends null when the list cannot be fetched", async () => {
    await run("Mozilla/5.0 (compatible; Perplexity-User/1.0)");
    expect(sentBody().properties.verified).toBeNull();
  });

  it("names a bare Google fetch", async () => {
    await run("Google");
    expect(sentBody().properties.agent).toBe("Google");
  });

  it("sends nothing for a reader", async () => {
    expect(await run(READER)).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing without a token", async () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "");
    expect(await run(CHATGPT)).not.toHaveBeenCalled();
  });

  it("sends nothing outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await run(CHATGPT)).not.toHaveBeenCalled();
  });
});
