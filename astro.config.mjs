// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// Endereço público. SITE_URL ganha quando houver domínio.
// No Amplify, o endereço da branch já vem nas variáveis da build.
const SITE =
  process.env.SITE_URL ||
  (process.env.AWS_APP_ID && process.env.AWS_BRANCH
    ? `https://${process.env.AWS_BRANCH}.${process.env.AWS_APP_ID}.amplifyapp.com`
    : 'http://localhost:4321');

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
