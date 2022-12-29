import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import robotsTxt from "astro-robots-txt";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  experimental: {
    integrations: true,
  },
  integrations: [preact(), robotsTxt(), sitemap(), tailwind()],
  site: "https://quiz.timmo.dev",
  markdown: {
    extendDefaultPlugins: true,
    shikiConfig: {
      theme: "github-dark-dimmed",
      wrap: false,
    },
  },
  vite: {
    ssr: {
      external: ["@11ty/eleventy-img", "svgo"],
    },
  },
});
