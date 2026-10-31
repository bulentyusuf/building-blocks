import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";

import StrandChips from "./strand-chips";
import PostStream from "./post-stream";

import { getAllPosts } from "@/lib/api";
import { visibleTagSlugs } from "@/lib/tags";
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

export default async function Page() {
  const { isEnabled } = await draftMode();
  const allPosts = await getAllPosts(isEnabled);

  return (
    <div className="mx-auto max-w-frame px-4 md:px-10 pt-6 pb-16">
      {/* The logo names the site visually; this names the page. */}
      <h1 className="sr-only">{SITE_TITLE}</h1>
      <StrandChips current="all" />

      <PostStream
        posts={allPosts.slice(0, HOME_CARDS + 1)}
        visibleTags={visibleTagSlugs(allPosts)}
      />

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
