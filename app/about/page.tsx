import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import UpdatedStamp from "../updated-stamp";
import Container from "../container";
import Breadcrumb, { type Crumb } from "../breadcrumb";
import { RichText } from "@/lib/rich-text";
import { getPage } from "@/lib/api";
import { SITE_TITLE, SITE_URL, DEFAULT_OG_LOCALE } from "@/lib/constants";

const SLUG = "about";

export async function generateMetadata(): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const page = await getPage(SLUG, isEnabled);

  if (!page) {
    return { title: "About" };
  }

  const description = `About ${SITE_TITLE}`;
  const canonical = `${SITE_URL}/${SLUG}`;

  return {
    title: page.title,
    description,
    alternates: { canonical },
    openGraph: {
      description,
      url: canonical,
      siteName: SITE_TITLE,
      images: [
        { url: "/be_useful.jpg", width: 1200, height: 630, alt: SITE_TITLE },
      ],
      type: "website",
      locale: DEFAULT_OG_LOCALE,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: ["/be_useful.jpg"],
    },
  };
}

export default async function AboutPage() {
  const { isEnabled } = await draftMode();
  const page = await getPage(SLUG, isEnabled);

  if (!page) {
    notFound();
  }

  const lastUpdated = page.sys.publishedAt ?? page.sys.firstPublishedAt;

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "About" }];

  return (
    <Container>
      {/* A reading page: the header and the quiet panel share one centred
          column, 49.25rem, the 42rem measure plus the panel's padding.
          [→ `post-page`, `breadcrumbs`] */}
      <div className="mx-auto max-w-[49.25rem]">
        <Breadcrumb items={crumbs} />
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
          {page.title}
        </h1>
        {lastUpdated && (
          <p className="mt-5">
            <UpdatedStamp dateString={lastUpdated} />
          </p>
        )}
        <article className="mt-9 pt-2 md:rounded-3xl md:border-2 md:border-edge-quiet md:bg-card md:px-14 md:py-12">
          <div className="prose text-pretty">
            <RichText
              content={page.body}
              headings={[]}
              lightbox={false}
              prioritizeFirstImage
            />
          </div>
        </article>
      </div>
    </Container>
  );
}
