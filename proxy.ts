import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

// The `has` condition keeps readers out entirely, so only named AI agents
// invoke this. Next anchors the value as ^value$ and matches case-sensitively.
export const config = {
  matcher: [
    {
      source: "/((?!_next/|pagefind/).*)",
      has: [
        {
          type: "header",
          key: "user-agent",
          value:
            "(?:.*(?<agent>GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|PerplexityBot|Perplexity-User|Google-Agent|Google-GeminiNotebook|meta-externalagent|Amazonbot).*|Google)",
        },
      ],
    },
  ],
};

const AGENT = new RegExp(`^${config.matcher[0].has[0].value}$`);

// Each operator's published IP ranges. An agent missing here is sent as
// verified: null, as is any agent whose lists could not be fetched.
const GOOGLE_FETCHERS = [
  "https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers.json",
  "https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers-google.json",
];
const ANTHROPIC = ["https://claude.com/crawling/bots.json"];
export const RANGES: Record<string, string[]> = {
  GPTBot: ["https://openai.com/gptbot.json"],
  "ChatGPT-User": ["https://openai.com/chatgpt-user.json"],
  "OAI-SearchBot": ["https://openai.com/searchbot.json"],
  ClaudeBot: ANTHROPIC,
  "Claude-User": ANTHROPIC,
  "Claude-SearchBot": ANTHROPIC,
  PerplexityBot: ["https://www.perplexity.ai/perplexitybot.json"],
  "Perplexity-User": ["https://www.perplexity.ai/perplexity-user.json"],
  Google: GOOGLE_FETCHERS,
  "Google-GeminiNotebook": GOOGLE_FETCHERS,
  "Google-Agent": [
    "https://developers.google.com/static/crawling/ipranges/user-triggered-agents.json",
  ],
};

function parseIp(ip: string): { bits: number; value: bigint } | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.some((part) => part > 255)) return null;
    const value = parts.reduce((acc, part) => (acc << 8n) | BigInt(part), 0n);
    return { bits: 32, value };
  }
  const halves = ip.split("::");
  if (!/^[0-9a-f:]+$/i.test(ip) || halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  if (groups.some((group) => group === "" || group.length > 4)) return null;
  const value = groups.reduce(
    (acc, group) => (acc << 16n) | BigInt(parseInt(group, 16)),
    0n,
  );
  return { bits: 128, value };
}

export function inRange(ip: string, cidr: string): boolean {
  const [base, lengthText] = cidr.split("/");
  const address = parseIp(ip);
  const network = parseIp(base ?? "");
  if (!address || !network || address.bits !== network.bits) return false;
  const length = lengthText === undefined ? address.bits : Number(lengthText);
  if (!Number.isInteger(length) || length < 0 || length > address.bits) {
    return false;
  }
  const shift = BigInt(address.bits - length);
  return address.value >> shift === network.value >> shift;
}

type Prefix = { ipv4Prefix?: unknown; ipv6Prefix?: unknown };

// One fetch per list per day per instance. A failed fetch is not cached.
const DAY = 86_400_000;
const lists = new Map<
  string,
  { at: number; cidrs: Promise<string[] | null> }
>();

function cidrsFrom(url: string): Promise<string[] | null> {
  const cached = lists.get(url);
  if (cached && Date.now() - cached.at < DAY) return cached.cidrs;
  const cidrs = fetch(url, { signal: AbortSignal.timeout(3000) })
    .then((response) => (response.ok ? response.json() : null))
    .then((json: { prefixes?: Prefix[] } | null) =>
      json?.prefixes
        ? json.prefixes
            .flatMap((prefix) => [prefix.ipv4Prefix, prefix.ipv6Prefix])
            .filter((cidr): cidr is string => typeof cidr === "string")
        : null,
    )
    .catch(() => null)
    .then((result) => {
      if (!result) lists.delete(url);
      return result;
    });
  lists.set(url, { at: Date.now(), cidrs });
  return cidrs;
}

export async function verify(
  agent: string,
  ip: string | null,
): Promise<boolean | null> {
  const urls = RANGES[agent];
  if (!urls || !ip) return null;
  const all = await Promise.all(urls.map(cidrsFrom));
  if (all.every((cidrs) => cidrs === null)) return null;
  return all.some((cidrs) => cidrs?.some((cidr) => inRange(ip, cidr)));
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const token = process.env.POSTHOG_PROJECT_TOKEN;
  const userAgent = request.headers.get("user-agent") ?? "";
  const match = AGENT.exec(userAgent);

  if (token && match && process.env.VERCEL_ENV === "production") {
    // A bare "Google" is what a Gemini fetch sent in testing.
    const agent = match.groups?.agent ?? "Google";
    // Vercel overwrites x-forwarded-for, so it cannot be spoofed. The IP is
    // checked here and never sent anywhere.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    event.waitUntil(
      verify(agent, ip)
        .then((verified) =>
          fetch("https://eu.i.posthog.com/i/v0/e/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: token,
              event: "ai_agent_request",
              distinct_id: `ai-agent:${agent}`,
              properties: {
                $process_person_profile: false,
                agent,
                path: request.nextUrl.pathname,
                user_agent: userAgent,
                verified,
              },
            }),
          }),
        )
        .catch(() => {}),
    );
  }

  return NextResponse.next();
}
