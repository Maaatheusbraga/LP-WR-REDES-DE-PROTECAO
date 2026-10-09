// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// Endereço público. Defina SITE_URL no Amplify quando o domínio existir.
const SITE = process.env.SITE_URL;

// https://astro.build/config
export default defineConfig({
  ...(SITE ? { site: SITE } : {}),
  output: 'static',
  compressHTML: true,
  // Prefetch the destination on hover so internal navigation is near-instant —
  // the page-to-page fade then feels snappy instead of waiting on the network.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: SITE
    ? [
        sitemap({
          filter: (page) => !/\/(401|404)\/?$/.test(page),
        }),
      ]
    : [],
});
