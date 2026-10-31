import { MetadataRoute } from "next";
import { SITE_TITLE, SITE_DESCRIPTION, THEME_COLOR } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "minimal-ui",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      // Chrome requires a 192 and a 512 PNG before it will offer to install a
      // site, and reads them from here rather than from any <link>. Hence
      // public/ rather than an app/icon.png file convention: these two are
      // referenced by path from this manifest and nowhere else.
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
