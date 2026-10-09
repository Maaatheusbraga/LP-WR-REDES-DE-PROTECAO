// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// Publicar URL. Override with a SITE_URL env var (or repo variable in CI).
const SITE = process.env.SITE_URL || 'https://temlis-eagle.workers.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  compressHTML: true,
  // Prefetch the destination on hover so internal navigation is near-instant —
  // the page-to-page fade then feels snappy instead of waiting on the network.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/(401|404)\/?$/.test(page),
    }),
  ],
});
