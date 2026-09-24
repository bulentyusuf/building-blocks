import "server-only";
import { CONTENTFUL_IMAGE_HOST } from "./contentful-host";

// A tiny base64 version for blurDataURL. Asset URLs are immutable, so it is
// fetched once per image.
export async function getBlurDataURL(src: string): Promise<string | undefined> {
  try {
    const url = new URL(src.startsWith("//") ? `https:${src}` : src);

    // Host-checked: this runs on the server and publishes the response.
    if (url.hostname !== CONTENTFUL_IMAGE_HOST) return undefined;
    url.searchParams.set("w", "10");
    url.searchParams.set("q", "30");
    url.searchParams.set("fm", "webp");
    const res = await fetch(url.toString(), { cache: "force-cache" });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/webp;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}
