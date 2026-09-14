import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// Custom domain (GitHub Pages): https://brandonchiesa.com/
export default defineConfig({
  site: "https://brandonchiesa.com",
  base: "/",
  trailingSlash: "always",
  integrations: [
    sitemap({
      changefreq: "monthly",
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) =>
        !["/work/", "/make/", "/go/", "/roots/", "/now/"].some((slug) =>
          page.includes(slug),
        ),
    }),
  ],
});
