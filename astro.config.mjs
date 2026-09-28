import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

function distDir(dir) {
  return typeof dir === "string" ? dir : fileURLToPath(dir);
}

/** Astro writes sitemap-0.xml plus an index. Also emit sitemap.xml for robots.txt. */
function emitSitemapXml() {
  return {
    name: "emit-sitemap-xml",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const folder = distDir(dir);
        const names = (await readdir(folder))
          .filter((name) => /^sitemap-\d+\.xml$/.test(name))
          .sort();
        if (names.length === 0) return;
        const chunks = await Promise.all(
          names.map((name) => readFile(new URL(name, dir), "utf8")),
        );
        const urls = chunks.flatMap((xml) =>
          [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]),
        );
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
        await writeFile(new URL("sitemap.xml", dir), body);
      },
    },
  };
}

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
    emitSitemapXml(),
  ],
});
