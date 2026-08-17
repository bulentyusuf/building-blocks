import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Date from "../date";
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
      {/* Constrained to the article's own measure, but not centred — every
          route on the site starts its content at Container's left edge, and
          a narrow page is no exception. Only the width is capped. */}
      <div className="max-w-2xl">
        <Breadcrumb items={crumbs} />
      </div>
      <article className="max-w-2xl">
        <h1 className="mb-6 text-4xl md:text-5xl">{page.title}</h1>
        {lastUpdated && (
          <p className="mb-4 text-sm text-brand-muted">
            Last updated <Date dateString={lastUpdated} />
          </p>
        )}
        <div className="prose text-pretty">
          <RichText
            content={page.body}
            headings={[]}
            lightbox={false}
            prioritizeFirstImage
          />
        </div>
      </article>
    </Container>
  );
}
