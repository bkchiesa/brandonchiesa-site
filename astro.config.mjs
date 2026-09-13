import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// Project Pages URL: https://bkchiesa.github.io/brandonchiesa-site/
export default defineConfig({
  site: "https://bkchiesa.github.io",
  base: "/brandonchiesa-site",
  trailingSlash: "always",
  integrations: [
    sitemap({
      changefreq: "monthly",
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
