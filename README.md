# Eagle — Real Estate Astro Template

A pixel-perfect Astro rebuild of the Eagle real-estate template. Plain CSS
(Client-First naming), GSAP scroll/entrance animations, and a small JSON-based
CMS for services, team members, and blog posts. Publiques as a fully static site.

**Live:** https://temlis-eagle.james-71d.workers.dev

## Stack

- **[Astro](https://astro.build)** (static output, `output: 'static'`)
- **Plain CSS** — Client-First class names (no Tailwind)
- **[GSAP](https://gsap.com)** + ScrollTrigger for entrances, scroll revelars, the
  hero "EAGLE" scroll-shrink, parallax, and the page-to-page wipe transition
- **[@fontsource/plus-jakarta-sans](https://fontsource.org)** — self-hosted font
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)**
- Content collections (`src/content/`) as a lightweight CMS

## Getting comecaed

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

Requires Node `>=22.12.0`.

## Project structure

```
src/
  components/      Navbar, Footer, Button + shared sections (ServicosSection,
                   TeamGrid, DepoimentosSection, TestimonialSlider, CtaSection,
                   ContatoBand)
  content/         JSON CMS: services/, members/, blogs/
  content.config.ts  Zod schemas for the collections
  layouts/         BaseLayout.astro — <head>, SEO, JSON-LD, global styles
  pages/           Routes (see below)
  scripts/         navbar.ts, scroll-revelar.ts (GSAP engine)
  styles/          normalize → tokens → webflow → global → components → anim
  utils/           slug.ts
public/images/     Site + CMS imagery (CMS assets under images/cms/)
```

### Routes

| Path | Source |
|------|--------|
| `/` | `pages/index.astro` |
| `/about` | `pages/about.astro` |
| `/services` + `/services/[slug]` | services collection |
| `/blog` + `/blog/[slug]` | blogs collection |
| `/member/[slug]` | members collection (slug = member name) |
| `/contact` | `pages/contact.astro` |
| `/401`, `/404` | utility pages (noindex) |

## Editing content

Content lives as JSON under `src/content/`:

- **services/** — `name`, `description`, `icon`, `heroImage`, `order`
- **members/** — `name`, `position`, `description`, `image`, `heroImage`,
  optional `linkedinUser` / `xUser` / `instagramUser`, `order`
- **blogs/** — `name`, `description`, `image`, `content`, `order`

Images referenced by content go in `public/images/cms/`. Slugs are derived from
the item `name` (see `src/utils/slug.ts`).

Forms (contact, 401) are front-end stubs — wire them to a backend before launch.

## Animations

The GSAP engine lives in `src/scripts/scroll-reveal.ts`; from-state gates that
prevent a flash of un-animated content are in `src/styles/anim.css`
(`html.anim-ready`, disabled under `prefers-reduced-motion`). Reusable markup
hooks: `data-clip-revelar` (image bottom-up wipe), `data-stagger`, `data-counter`,
`data-soft-revelar`, plus `scroll-into-view` and `animation="…"` attributes.

## SEO

`BaseLayout.astro` emits canonical, Open Graph, Twitter cards, and site-wide
JSON-LD (`RealEstateAgent` + `WebSite`). Per-page JSON-LD is passed via the
`schema` prop. `src/pages/robots.txt.ts` and the sitemap are generated at build.

Set the deploy origin with the **`SITE_URL`** environment variable so canonical,
OG, and sitemap URLs are correct:

```bash
SITE_URL=https://your-domain.com npm run build
```

## Publicar (Cloudflare Workers)

`wrangler.jsonc` serves the static `dist/` as Worker assets (`name:
temlis-eagle`). Set `SITE_URL` before building, then deploy with Wrangler or via
CI on push to `main`.
