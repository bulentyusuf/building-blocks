import { MetadataRoute } from "next";
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_ICONS,
  BRAND_HEADER_COLOR,
} from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "minimal-ui",
    background_color: "#FAF5F1",
    theme_color: BRAND_HEADER_COLOR,
    icons: [
      {
        src: SITE_ICONS.favicon,
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: SITE_ICONS.apple,
        sizes: "180x180",
        type: "image/png",
      },
      // Chrome requires a 192 and a 512 PNG before it will offer to install a
      // site, and reads them from here rather than from any <link>. All four
      // paths now come from SITE_ICONS, which is what lets a second deployment
      // of this repo carry its own mark; lib/constants.ts holds the argument.
      {
        src: SITE_ICONS.icon192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: SITE_ICONS.icon512,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
