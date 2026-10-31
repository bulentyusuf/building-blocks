import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";

import StrandChips from "./strand-chips";
import PostCard, { FeatureCard } from "./post-card";

import { getAllPosts } from "@/lib/api";
import { postTags, visibleTagSlugs } from "@/lib/tags";
import {
  SITE_URL,
  SITE_TITLE,
  HOME_TITLE,
  HOME_DESCRIPTION,
} from "@/lib/constants";

export const metadata: Metadata = {
  // Absolute, or the layout's "%s | Be Useful." template repeats the name.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: SITE_URL },
};

// The latest post plus this many, then the archive. No pager. [→ `strands`]
const HOME_CARDS = 10;

// Mono labels, with the slashes kept out of the name.
function Label({ children }: { children: string }) {
  return (
    <h2 className="mb-5 font-mono text-sm font-medium tracking-normal">
      <span aria-hidden="true">{"// "}</span>
      {children}
    </h2>
  );
}

export default async function Page() {
  const { isEnabled } = await draftMode();
  const allPosts = await getAllPosts(isEnabled);
  const [latest, ...rest] = allPosts;
  const previous = rest.slice(0, HOME_CARDS);
  const visibleTags = visibleTagSlugs(allPosts);

  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-16">
      {/* The logo names the site visually; this names the page. */}
      <h1 className="sr-only">{SITE_TITLE}</h1>
      <StrandChips current="all" />

      {latest && (
        <section className="mt-12">
          <Label>latest post</Label>
          <FeatureCard
            post={latest}
            tags={postTags(latest).filter((t) => visibleTags.has(t.slug))}
          />
        </section>
      )}

      {previous.length > 0 && (
        <section className="mt-16">
          <Label>previous posts</Label>
          <ul className="grid gap-8 md:grid-cols-2 md:gap-9">
            {previous.map((post) => (
              <li key={post.slug} className="flex">
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12 flex justify-center">
        <Link
          href="/archive"
          className="inline-flex min-h-11 items-center rounded-xl border-[3px] border-brand-dark bg-card px-5 font-mono text-[0.9375rem] font-medium shadow-[4px_4px_0_var(--color-brand-crimson)] transition-[translate,box-shadow] duration-150 hover:translate-[4px] hover:shadow-none motion-reduce:transition-none"
        >
          Every post, in the archive
        </Link>
      </div>
    </div>
  );
}
