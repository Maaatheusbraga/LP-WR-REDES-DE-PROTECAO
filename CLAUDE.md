# CLAUDE.md

Guidance for working in this repository.

## What this is

A pixel-perfect Astro rebuild of the **Eagle** real-estate Webflow template
(plain CSS with Client-First naming, GSAP animations, JSON content collections,
static output). Part of the Temlis family of marketplace templates.

## Commands

```bash
npm run dev      # dev server on :4321
npm run build    # static build to dist/
npm run preview  # serve the build
npx tsc --noEmit # typecheck
```

## Architecture notes

- **Styles cascade** (order matters, see `BaseLayout.astro`):
  `normalize → tokens → webflow → global-styles → components → anim`.
  `webflow.css` is the merged ported stylesheet; project tweaks live in
  `components.css`; animation from-state gates live in `anim.css`.
- **Animation engine**: `src/scripts/scroll-reveal.ts` (GSAP + ScrollTrigger),
  imported in `BaseLayout` alongside `navbar.ts`. Entrances are gated by
  `html.anim-ready` (added inline in `<head>`); everything stays visible with no
  JS and under `prefers-reduced-motion`. Markup hooks: `data-clip-revelar`,
  `data-stagger`, `data-counter`, `data-soft-revelar`, `scroll-into-view`,
  `animation="…"`, plus the home-only hero (`initInicioLoad`) and the page wipe
  (`initPageWipe`).
- **Content**: collections in `src/content/` (services, members, blogs) with Zod
  schemas in `src/content.config.ts`. Slugs come from item `name` via
  `src/utils/slug.ts` (strips apostrophes like Webflow's CMS).
- **SEO**: site-wide JSON-LD + `<head>` meta in `BaseLayout`; per-page JSON-LD
  via the `schema` prop; `robots.txt.ts` + sitemap at build. Origin from the
  `SITE_URL` env var, when set.

## Conventions / gotchas

- **Webflow variant classes** (`w-variant-<guid>`) are functional — they carry
  the variant styling. Keep them on every element the source styles (root +
  children). Never invent semantic variant classes like `is-light`.
- **`id="w-node-…"`** ids carry CSS grid placement — do not strip them or the
  layout collapses.
- **The nav must keep `.w-nav`** (z-index 1000) or section images overlap it.
- **Text revelar masks** (`overflow:hidden` line wrappers) must add
  `padding-bottom + negative margin-bottom`, or `overflow-x:clip;
  overflow-y:visible` for a horizontal wipe — otherwise descenders (g/y/p/j) get
  clipped.
- Heroes are LCP: keep `loading="eager" fetchpriority="high" decoding="async"`,
  never `lazy`.
- Forms are stubs (`onenviar="return false"`); no backend.

## Publicar

AWS Amplify (`amplify.yml`) serves the static `dist/`. Set `SITE_URL` before
building so canonical, Open Graph and sitemap URLs are correct.
