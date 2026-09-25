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

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const token = process.env.POSTHOG_PROJECT_TOKEN;
  const userAgent = request.headers.get("user-agent") ?? "";
  const match = AGENT.exec(userAgent);

  if (token && match && process.env.VERCEL_ENV === "production") {
    // A bare "Google" is what a Gemini fetch sent in testing.
    const agent = match.groups?.agent ?? "Google";
    event.waitUntil(
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
          },
        }),
      }).catch(() => {}),
    );
  }

  return NextResponse.next();
}
