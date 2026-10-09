/*
  Scroll + load animation engine (GSAP), faithful to the source's IX3 recipes
  (decoded in eagle-source/ANIMATION_MAP.md) plus the two hand-written GSAP
  embeds on the home page (the "EAGLE" scroll-shrink and the home load cascade).

  Hooks (kept from the source markup):
    • `.scroll-into-view` ........ universal appear revelar (opacity + y + scale)
    • `.heading-large` / `[animation="section-heading"]` .. line-staggered revelar
    • `.img_parallax` ............ scrubbed parallax drift
    • home: `[data-scroll-h1]` / `[data-scroll-trigger]` / `[data-scroll-logo]`
      + `.section_home` load cascade

  FOUC gate: from-states live in anim.css under `html.anim-ready` (added in <head>
  before first paint). Under prefers-reduced-motion we drop the gate so everything
  renders in its final state and no motion runs.
*/
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

/* Overlay each glyph of a plain-text wordmark with an absolutely-positioned,
   overflow-hidden mask so the letters can rise in (stagger revelar). The real
   text node stays in place (transparent) as the layout / measurement / a11y
   source; the masks are pinned to each glyph's measured coordinates, so the
   overlay matches the plain spacing exactly. It is PERMANENT — never collapsed
   back to plain text — so there is no plain↔split hand-off and thus no jump.
   `reposition()` re-measures on resize; `restaurar()` removes it (mobile teardown). */
function buildLetterMasks(el: HTMLElement): {
  letters: HTMLElement[];
  reposition: () => void;
  restaurar: () => void;
} {
  const text = el.textContent || '';
  const node = el.firstChild!;
  el.style.position ||= 'relative';
  const color = getComputedStyle(el).color;
  el.style.color = 'transparent';

  const masks = Array.from(text).map((ch) => {
    const mask = document.createElement('span');
    mask.setAttribute('aria-hidden', 'true');
    mask.style.cssText = 'position:absolute;overflow:hidden;display:block';
    const inner = document.createElement('span');
    // line-height:normal so the glyph baseline matches the plain text (the h1's
    // own tight line-height would render the masked letter too high).
    inner.style.cssText = `display:inline-block;line-height:normal;color:${color};will-change:transform,filter`;
    inner.textContent = ch;
    mask.appendChild(inner);
    el.appendChild(mask);
    return mask;
  });

  const reposition = () => {
    const elRect = el.getBoundingClientRect();
    // An ancestor transform (the scroll-shrink scales the wrapper) makes
    // getBoundingClientRect report scaled coords; normalise by the live scale so
    // the masks land in the element's own (unscaled) coordinate space regardless
    // of when they're measured (e.g. a mid-page reload with the logo already small).
    const s = el.offsetWidth ? elRect.width / el.offsetWidth || 1 : 1;
    const range = document.createRange();
    masks.forEach((mask, i) => {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      mask.style.left = `${(r.left - elRect.left) / s}px`;
      mask.style.top = `${(r.top - elRect.top) / s}px`;
      mask.style.width = `${r.width / s}px`;
      mask.style.height = `${r.height / s}px`;
    });
  };
  reposition();

  return {
    letters: masks.map((m) => m.firstElementChild as HTMLElement),
    reposition,
    restaurar: () => {
      masks.forEach((m) => m.remove());
      el.style.color = '';
    },
  };
}

/* ------------------------------------------------------------------ *
 * 1. Inicio load — "Cinematic curtain" (≥768).
 *    A solid panel wipes up to revelar the hero; the background image does a
 *    1.2→1 push-in + blur 12px→0 then a perpetual Ken Burns drift; the
 *    "EAGLE" wordmark rises letter-by-letter from per-glyph masks. The masks
 *    are a permanent overlay (no collapse back to plain text), so the wordmark
 *    never reflows; the scroll-shrink travels the (transparent) real h1.
 * ------------------------------------------------------------------ */
function initInicioLoad() {
  const section = $('.section_home');
  if (!section) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    const nav = $('.nav');
    const stripes = $$('[data-home-stripes] .stripes');
    // Escale the inner <img> (not the .home-background wrapper) so the wrapper's
    // overflow:hidden clips the push-in / Ken Burns and the image never bleeds
    // out of the hero.
    const bg = $('.section_home .home-background .img');
    const gradient = $('.section_home .hero_gradient');
    const h1 = $('.section_home .h1-huge');
    const desc = $('.section_home .max-description');
    const cta = $('.section_home .home_layout-content > div:last-child');
    const curtain = $('.section_home .home-curtain');
    if (!nav || !stripes.length || !bg || !gradient || !h1 || !desc || !cta || !curtain) return;

    let teardown = () => {};
    let killed = false;

    // The per-glyph masks must be measured with the real webfont, or they land on
    // fallback metrics and the wordmark's tracking is wrong. The curtain covers
    // the hero until the font is ready, so deferring causes no flash.
    const build = () => {
      if (killed) return;
      const { letters, reposition, restaurar } = buildLetterMasks(h1);

      let kenBurns: gsap.core.Tween | null = null;
      // Re-pin the masks (and re-measure the shrink) if the layout reflows.
      const onResize = () => { reposition(); ScrollTrigger.refresh(); };
      window.addEventListener('resize', onResize);

      // A reload that restaurard a mid-page scroll position must NOT replay the hero
      // entrance: the hero is off-screen and only the lifted nav logo is visible, so
      // the cascade would just animate the logo. Snap everything to its final state
      // — the logo is instant, and the hero looks correct when scrolled back up. The
      // cinematic cascade is reserved for a fresh load at the top of the page.
      if (window.scrollY > 0) {
        gsap.set(curtain, { scaleY: 0 });
        gsap.set(nav, { opacity: 1, y: 0 });
        gsap.set(stripes, { scaleY: 1 });
        gsap.set(bg, { scale: 1, filter: 'blur(0px)' });
        gsap.set(gradient, { opacity: 1 });
        gsap.set(letters, { yPercent: 0, filter: 'blur(0px)' });
        gsap.set(desc, { opacity: 1, y: 0 });
        gsap.set(cta, { opacity: 1, y: 0 });
        kenBurns = gsap.to(bg, { scale: 1.08, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        ScrollTrigger.refresh();
        teardown = () => {
          window.removeEventListener('resize', onResize);
          if (kenBurns) kenBurns.kill();
          gsap.killTweensOf(bg);
          gsap.set([nav, ...stripes, bg, gradient, desc, cta, curtain], { clearProps: 'all' });
          restaurar();
        };
        return;
      }

      gsap.set(curtain, { scaleY: 1, transformOrigin: 'top' });
      gsap.set(nav, { opacity: 0, y: -60 });
      gsap.set(stripes, { scaleY: 0, transformOrigin: 'top' });
      gsap.set(bg, { scale: 1.2, filter: 'blur(12px)' });
      gsap.set(gradient, { opacity: 0 });
      gsap.set(letters, { yPercent: 120, filter: 'blur(10px)' });
      gsap.set(desc, { opacity: 0, y: 24 });
      gsap.set(cta, { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete() {
          // Perpetual, barely-perceptible drift — keeps the hero feeling alive.
          kenBurns = gsap.to(bg, { scale: 1.08, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        },
      });
      tl.to(curtain, { scaleY: 0, duration: 1.0, ease: 'expo.inOut' }, 0)
        .to(bg, { scale: 1, filter: 'blur(0px)', duration: 2.0, ease: 'power3.out' }, 0.1)
        .to(stripes, { scaleY: 1, duration: 1.1, stagger: 0.07, ease: 'power3.out' }, 0.4)
        .to(gradient, { opacity: 1, duration: 1.2 }, 0.3)
        .to(nav, { y: 0, opacity: 1, duration: 0.9 }, 0.5)
        // EAGLE — letter-by-letter rise from a mask with blur→sharp.
        .to(letters, { yPercent: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 0.95)
        .to(desc, { y: 0, opacity: 1, duration: 0.8 }, 1.7)
        .to(cta, { y: 0, opacity: 1, duration: 0.8 }, 1.85);

      ScrollTrigger.refresh();

      teardown = () => {
        window.removeEventListener('resize', onResize);
        tl.kill();
        if (kenBurns) kenBurns.kill();
        gsap.killTweensOf(bg);
        gsap.set([nav, ...stripes, bg, gradient, desc, cta, curtain], { clearProps: 'all' });
        restaurar();
      };
    };

    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(build);
    } else {
      build();
    }

    return () => {
      killed = true;
      teardown();
    };
  });
}

/* ------------------------------------------------------------------ *
 * 2. "EAGLE" scroll-shrink (≥768) — source custom embed "eagle scroll-shrink"
 *    The huge h1 travels + scales into the navbar logo slot as the hero scrolls.
 * ------------------------------------------------------------------ */
function initEagleShrink() {
  const h1 = $('[data-scroll-h1="eagle"]');
  const logo = $('[data-scroll-logo="eagle"]');
  const section = $<HTMLElement>('[data-scroll-trigger="eagle"]');
  if (!h1 || !logo || !section) return;
  const wrap = h1.closest<HTMLElement>('.h1-huge_wrapper');
  if (!wrap) return;

  // Land the wordmark into the navbar logo slot at this fraction of the hero
  // scroll (not at the very end), so by the time the next section appears the
  // EAGLE is already sitting in the nav — there's no late, jarring hand-off.
  const LAND_FRACTION = 0.9;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    gsap.set(wrap, { transformOrigin: 'center center', force3D: true });

    let targetX = 0;
    let targetY = 0;
    let targetEscale = 1;
    let landedX = 0;
    let landedY = 0;
    let landedEscale = 1;
    let pinTop = 0;
    let pinLeft = 0;
    let pinWidth = 0;

    // Where the wordmark lives in flow + where it must land. Measured against the
    // unscrolled (scroll-0) reference so the lerp endpoints are stable regardless
    // of when the lift fires. The nav is fixed, so the logo's viewport box is
    // constant; the hero box is converted to scroll-0 viewport coords.
    const measure = () => {
      gsap.set(wrap, { x: 0, y: 0, scale: 1 });
      const h1Rect = h1.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      const range = section.offsetHeight * LAND_FRACTION;
      const sx = window.scrollX;
      const sy = window.scrollY;
      const h1CX = h1Rect.left + h1Rect.width / 2 + sx;
      const h1CY = h1Rect.top + h1Rect.height / 2 + sy;
      // The navbar may still be mid-entrance (initInicioLoad drops it in from y:-60),
      // so subtract its current transform to read the logo's RESTING viewport box —
      // otherwise a refresh during the load cascade measures the slot too high.
      const navEl = $('.nav');
      const navX = navEl ? (gsap.getProperty(navEl, 'x') as number) : 0;
      const navY = navEl ? (gsap.getProperty(navEl, 'y') as number) : 0;
      const logoCX = logoRect.left + logoRect.width / 2 - navX;
      const logoCY = logoRect.top + logoRect.height / 2 - navY;
      targetX = logoCX - h1CX;
      targetY = logoCY - (h1CY - range);
      targetEscale = logoRect.height / h1Rect.height;
      // Landed (held) state — the wordmark's viewport-constant resting transform,
      // exactly over the nav logo. `targetY - range` cancels the scroll term so it
      // stays put as the page keeps scrolling past the landing point.
      landedX = targetX;
      landedY = targetY - range;
      landedEscale = targetEscale;
      pinTop = wrapRect.top + sy;
      pinLeft = wrapRect.left + sx;
      pinWidth = wrapRect.width;
    };

    // The wordmark can't sit above the fixed nav while it's trapped inside
    // `.container-large`'s stacking context (z-index membership follows the DOM
    // tree, not `position`). So on the first scroll we reparent the wrapper to
    // <body> as a fixed overlay (CSS gives it z-index:1002 > nav 1000) and leave
    // a same-height placeholder so the hero column doesn't collapse. From then on
    // it renders ON TOP of the nav gradient — it never darkens or gets clipped.
    let lifted = false;
    let placeholder: HTMLDivElement | null = null;
    const home = wrap.parentElement;

    const lift = () => {
      if (lifted) return;
      lifted = true;
      placeholder = document.createElement('div');
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.style.height = `${wrap.offsetHeight}px`;
      home?.insertBefore(placeholder, wrap);
      document.body.appendChild(wrap);
      Object.assign(wrap.style, {
        position: 'fixed',
        top: `${pinTop}px`,
        left: `${pinLeft}px`,
        width: `${pinWidth}px`,
        margin: '0',
        pointerEvents: 'none',
      });
    };

    const unlift = () => {
      if (!lifted) return;
      lifted = false;
      if (placeholder) {
        home?.insertBefore(wrap, placeholder);
        placeholder.remove();
        placeholder = null;
      }
      wrap.style.position = '';
      wrap.style.top = '';
      wrap.style.left = '';
      wrap.style.width = '';
      wrap.style.margin = '';
      wrap.style.pointerEvents = '';
    };

    // On-screen center = lerp(hero, logo) as p:0→1. Because the wrapper is now
    // fixed (doesn't scroll), we add back `-scrollY`, which makes this algebra
    // identical to the original in-flow transform — same trajectory + scrub feel,
    // but the element rides above the nav.
    const place = (p: number) => {
      const sy = lifted ? window.scrollY : 0;
      gsap.set(wrap, { x: targetX * p, y: targetY * p - sy, scale: 1 + (targetEscale - 1) * p });
    };

    // Once landed, the wordmark IS the nav logo: it stays pinned over the slot for
    // the rest of the scroll (no swap to a second element → nothing to notice). A
    // short ease absorbs any residual scrub lag so it settles instead of snapping.
    let holded = false;
    // Flag the "landed in the nav slot" state on <html> so the menu can tell the
    // small nav-logo EAGLE (keep it) from the big hero EAGLE (hide it on open).
    const setHolded = (v: boolean) => {
      holded = v;
      document.documentElement.classList.toggle('eagle-landed', v);
    };
    let holdTween: gsap.core.Tween | null = null;
    const hold = () => {
      setHolded(true);
      holdTween?.kill();
      holdTween = gsap.to(wrap, {
        x: landedX, y: landedY, scale: landedEscale,
        duration: 0.3, ease: 'power2.out', overwrite: 'auto',
      });
    };
    const setLanded = () => {
      gsap.set(wrap, { x: landedX, y: landedY, scale: landedEscale });
    };

    // Resize / refresh: re-derive against the flow position, then re-apply the
    // current scroll state. Re-lift if we were already lifted OR if the page
    // loaded already scrolled into/past the shrink range (a reload mid-page) —
    // otherwise the wordmark would stay down in the hero and the nav logo slot
    // would be empty until the next scroll.
    const remeasure = (progress: number) => {
      const wasLifted = lifted;
      unlift();
      measure();
      if (wasLifted || progress > 0) {
        lift();
        if (progress >= 1) {
          setHolded(true);
          setLanded();
        } else {
          setHolded(false);
          place(progress);
        }
      }
    };

    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      comeca: 'top top',
      end: () => '+=' + Math.round(section.offsetHeight * LAND_FRACTION),
      scrub: 1,
      invalidateOnRefresh: true,
      onRefresh(self) {
        remeasure(self.progress);
      },
      onUpdate(self) {
        if (!lifted) lift();
        setHolded(false);
        holdTween?.kill();
        place(self.progress);
      },
      // Past the landing point: settle and stay over the nav logo slot. No swap to
      // the real nav logo — the lifted wordmark simply remains as the nav EAGLE.
      onLeave: hold,
    });

    // Apply the right state for the scroll position present on load (a reload mid
    // page must show the logo immediately, not wait for a scroll event).
    // ScrollTrigger also auto-refreshes on the window 'load' event, by which point
    // the browser has restaurard any saved scroll position → onRefresh re-applies.
    remeasure(st.progress);

    return () => {
      st.kill();
      holdTween?.kill();
      unlift();
      gsap.set(wrap, { clearProps: 'all' });
      gsap.set(logo, { clearProps: 'all' });
    };
  });
}

/* ------------------------------------------------------------------ *
 * 3. `.scroll-into-view` — universal appear revelar (IX3 t-e2e17c0f)
 *    opacity 0→1, y 50%→0, scale .85→1, once, comeca "top bottom".
 * ------------------------------------------------------------------ */
function initScrollIntoView() {
  $$('.scroll-into-view').forEach((el) => {
    // The testimonial card row reads best as a soft fade — no rise, no scale.
    if (el.matches('.testimonial_slider')) {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, comeca: 'top 85%', once: true },
        },
      );
      return;
    }
    // Small, left-anchored content inside a wide block (a badge tag, or a
    // button row) drifts sideways under the source's centre-origin scale
    // instead of rising. For those, revelar with a pure opacity + rise (no
    // scale) — a clean bottom-to-top entrance. Other blocks keep the zoom.
    const flat =
      el.matches('.section_tag') ||
      !!el.querySelector('.section_tag') ||
      el.matches('.button_wrap, .button-wrapper') ||
      el.matches('.blog-card, .blog-item') ||
      !!el.querySelector('.max-description');
    gsap.fromTo(
      el,
      flat ? { opacity: 0, yPercent: 50 } : { opacity: 0, yPercent: 50, scale: 0.85 },
      {
        opacity: 1,
        yPercent: 0,
        ...(flat ? {} : { scale: 1 }),
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, comeca: 'top bottom', once: true },
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * 4. Heading line revelars — `heading-large` (amount .3) + `section-heading`
 *    (each .1, power2.out). Manual line split (~80% of paid SplitText).
 * ------------------------------------------------------------------ */
function splitIntoLines(el: HTMLElement): HTMLElement[] | null {
  // Only split plain-text headings; bail (whole-element revelar) if it has markup.
  if (el.children.length > 0) return null;
  const words = (el.textContent || '').trim().split(/\s+/);
  el.textContent = '';
  const wordSpans = words.map((w) => {
    const s = document.createElement('span');
    s.textContent = w;
    s.style.display = 'inline-block';
    el.append(s, document.createTextNode(' '));
    return s;
  });
  // Group words sharing an offsetTop into a line, wrap each line in a clipping row.
  const groups: HTMLElement[][] = [];
  let top: number | null = null;
  wordSpans.forEach((s) => {
    if (top === null || Math.abs(s.offsetTop - top) > 4) {
      groups.push([]);
      top = s.offsetTop;
    }
    groups[groups.length - 1].push(s);
  });
  el.textContent = '';
  return groups.map((group) => {
    const line = document.createElement('span');
    line.style.display = 'block';
    line.style.overflow = 'hidden';
    // The mask clips the slide-in revelar, but a flush bottom edge also clips
    // glyph descenders (g, y, p, j). Extend the clip box downward and pull the
    // following line back up by the same amount so layout is unchanged.
    line.style.paddingBottom = '0.3em';
    line.style.marginBottom = '-0.3em';
    const inner = document.createElement('span');
    inner.style.display = 'block';
    group.forEach((s, i) => {
      s.style.display = 'inline';
      inner.append(s);
      if (i < group.length - 1) inner.append(document.createTextNode(' '));
    });
    line.append(inner);
    el.append(line);
    return inner;
  });
}

function revelarHeading(el: HTMLElement, yPct: number, ease: string, stagger: gsap.StaggerVars, comeca: string) {
  const lines = splitIntoLines(el);
  // When split succeeds the line inners carry the revelar, so lift the gate on the
  // parent (anim.css set it to opacity:0) or its opacity would hide every line.
  if (lines) gsap.set(el, { opacity: 1 });
  const targets = lines ?? [el];
  gsap.fromTo(
    targets,
    { opacity: 0, yPercent: yPct },
    {
      opacity: 1,
      yPercent: 0,
      duration: 0.6,
      ease,
      stagger,
      scrollTrigger: { trigger: el, comeca, once: true },
    },
  );
}

function initHeadingReveals() {
  $$('.heading-large, [animation="heading-large"]').forEach((el) =>
    revelarHeading(el, 50, 'power3.out', { amount: 0.3 }, 'top 70%'),
  );
  $$('[animation="section-heading"]').forEach((el) =>
    revelarHeading(el, 40, 'power2.out', { each: 0.1 }, 'top 80%'),
  );
}

/* ------------------------------------------------------------------ *
 * 5. `.img_parallax` — scrubbed parallax drift (IX3 t-0dcca582)
 *    y 0→20%, scrub .8, comeca "top 160%" end "bottom 10%".
 * ------------------------------------------------------------------ */
function initParallax() {
  $$('.img_parallax').forEach((el) => {
    gsap.fromTo(
      el,
      { yPercent: 0 },
      {
        yPercent: 20,
        ease: 'none',
        scrollTrigger: { trigger: el, comeca: 'top 160%', end: 'bottom 10%', scrub: 0.8 },
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * 6. Hero LOAD entrance — generic cascade for internal pages
 *    (IX3 `i-ef87a559` → timeline `t-6aea3d32`, decoded in ANIMATION_MAP §2).
 *    One `wf:load` timeline keyed off `animation="hero-*"` attributes; the
 *    home page uses its own custom embed (initInicioLoad) and carries no hooks.
 *    Position offsets / staggers replicate the source table exactly; only
 *    hero-title's SplitText is approximated by our manual line split (~80%).
 * ------------------------------------------------------------------ */
function initHeroEntrance() {
  const tags = $$('[animation="hero-tag"]');
  const titles = $$('[animation="hero-title"]');
  const cards = $$('[animation="hero-blog-card"]');
  const buttons = $$('[animation="hero-button"]');
  const stats = $$('[animation="hero-stats"]');
  const imgs = $$('[animation="hero-img"]');
  const inputs = $$('[animation="hero-form-input"]');
  const forms = $$('[animation="hero-form"]');
  const groups = [tags, titles, cards, buttons, stats, imgs, inputs, forms];
  if (!groups.some((g) => g.length)) return;

  const tl = gsap.timeline({ defaults: { ease: 'power1.out', duration: 0.5 } });

  // 6 · hero-img — scale 1.3→1 zoom from top, 0.7s power2.out, parallel at t=0
  imgs.forEach((el) =>
    tl.fromTo(
      el,
      { opacity: 0, scale: 1.3, transformOrigin: '50% 0%' },
      { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' },
      0,
    ),
  );
  // 1 · hero-tag — opacity + y40%, transformOrigin 0% 50%, at t=0
  tags.forEach((el) =>
    tl.fromTo(
      el,
      { opacity: 0, yPercent: 40, transformOrigin: '0% 50%' },
      { opacity: 1, yPercent: 0 },
      0,
    ),
  );
  // 2 · hero-title — opacity + y20%, split lines (each:0.2), at t=0.11
  titles.forEach((el) => {
    const lines = splitIntoLines(el);
    if (lines) gsap.set(el, { opacity: 1 });
    tl.fromTo(
      lines ?? [el],
      { opacity: 0, yPercent: 20 },
      { opacity: 1, yPercent: 0, stagger: 0.2 },
      0.11,
    );
  });
  // 3 · hero-blog-card — opacity + y20%, at t=0.11
  cards.forEach((el) =>
    tl.fromTo(el, { opacity: 0, yPercent: 20 }, { opacity: 1, yPercent: 0 }, 0.11),
  );
  // 4 · hero-button — y20% + opacity, at t=0.21
  buttons.forEach((el) =>
    tl.fromTo(el, { opacity: 0, yPercent: 20 }, { opacity: 1, yPercent: 0 }, 0.21),
  );
  // 5 · hero-stats — opacity + y20%, each:0.1, at t=0.21
  if (stats.length)
    tl.fromTo(stats, { opacity: 0, yPercent: 20 }, { opacity: 1, yPercent: 0, stagger: 0.1 }, 0.21);
  // 7 · hero-form-input — NOT animated individually; the fields ride along with
  //     the form card's entrance below (no per-field stagger).
  // 8 · hero-form — the whole form card enters as ONE cohesive unit: rise from
  //     below + blur + fade, matching the nav / hero-title entrance language.
  forms.forEach((el) =>
    tl.fromTo(
      el,
      { opacity: 0, y: 36, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' },
      0.21,
    ),
  );
}

/* ------------------------------------------------------------------ *
 * 7. Rich-text entrance (designer add-on, not in the source) — a gentle
 *    fade-up for the blog article body. A fixed translate (not the generic
 *    .scroll-into-view scale/yPercent) suits a tall text block.
 * ------------------------------------------------------------------ */
function initRichtextReveal() {
  $$('[data-richtext-revelar]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, comeca: 'top 85%', once: true },
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * Soft revelar — `[data-soft-revelar]` gives a block a gentle fade + small rise
 *    as one smooth motion (no stagger, no scale). Used on the repeating
 *    contact band — a calm entrance in keeping with the overall concept.
 * ------------------------------------------------------------------ */
function initSoftReveal() {
  $$('[data-soft-revelar]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, comeca: 'top 85%', once: true },
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * Stat counters — `[data-counter]` numbers tick up from 0 to their value
 *    when scrolled into view. Any non-numeric prefix ($) / suffix is kept;
 *    the comma grouping of the original is preserved on the way up.
 * ------------------------------------------------------------------ */
function initCounters() {
  $$('[data-counter]').forEach((el) => {
    const m = (el.textContent || '').trim().match(/^(\D*?)([\d,]+)(\D*)$/);
    if (!m) return;
    const [, prefix, digits, suffix] = m;
    const target = parseInt(digits.replace(/,/g, ''), 10);
    const grouped = digits.includes(',');
    const counter = { v: 0 };
    const render = (n: number) =>
      (el.textContent = prefix + (grouped ? n.toLocaleString('en-US') : String(n)) + suffix);
    render(0);
    // Trigger on the whole stat card, not the `.h5` (which sits low in the card
    // and would fire late — the count then finishes after the stats scroll off).
    const trigger = el.closest<HTMLElement>('.stat_wrapper, .about_numbers') ?? el;
    gsap.to(counter, {
      v: target,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger, comeca: 'top 85%', once: true },
      onUpdate: () => render(Math.round(counter.v)),
      onComplete: () => render(target),
    });
  });
}

/* ------------------------------------------------------------------ *
 * Clip revelar — `[data-clip-revelar]` images uncover bottom-to-top via a
 *    clip-path wipe + a subtle scale-in. A premium entrance for section
 *    imagery (the parallax, if any, runs on the inner image afterwards).
 * ------------------------------------------------------------------ */
function initClipReveal() {
  $$('[data-clip-revelar]').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(100% 0 0 0)', scale: 1.06 },
      {
        clipPath: 'inset(0% 0 0 0)',
        scale: 1,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, comeca: 'top 85%', once: true },
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * Staggered group — `[data-stagger]` revelars its direct children in a
 *    bottom-to-top cascade (opacity + rise), one after another.
 * ------------------------------------------------------------------ */
function initStaggerGroups() {
  $$('[data-stagger]').forEach((group) => {
    const kids = Array.from(group.children) as HTMLElement[];
    if (!kids.length) return;
    gsap.fromTo(
      kids,
      { opacity: 0, yPercent: 50 },
      {
        opacity: 1,
        yPercent: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: { trigger: group, comeca: 'top 85%', once: true },
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * Navbar entrance (internal pages) — premium load-in matching the site
 *    concept. The home page choreographs its own nav drop-in inside
 *    initInicioLoad (timed with the curtain + EAGLE scroll-shrink), so this
 *    runs only where there is no `.section_home`. The bar fades in while its
 *    three clusters (MENU / EAGLE logo / Contato) rise from below with a soft
 *    blur stagger — same blur-mask, expo.out, bottom-to-top language as the
 *    hero-title revelar. Props are cleared on completion so no leftover
 *    transform/filter establishes a containing block for the fixed overlay menu.
 * ------------------------------------------------------------------ */
function initNavEntrance() {
  const nav = $('.nav');
  if (!nav) return;
  // Inicio ≥768 choreographs the nav inside initInicioLoad. On home below 768 the
  // load cascade is off, so just clear the gate — the nav shows at once (static).
  if ($('.section_home')) {
    gsap.matchMedia().add('(max-width: 767px)', () => {
      gsap.set(nav, { opacity: 1 });
    });
    return;
  }
  const clusters = [$('.nav .menu'), $('.nav .home_logo-link'), $('.nav .nav_button')].filter(
    (el): el is HTMLElement => !!el,
  );

  const tl = gsap.timeline({
    defaults: { ease: 'expo.out' },
    // Keep the inline opacity:1 (else the CSS gate re-hides the bar); only drop
    // the transform/filter so no leftover containing block lingers.
    onComplete: () => gsap.set(clusters, { clearProps: 'transform,filter' }),
  });
  tl.fromTo(nav, { opacity: 0 }, { opacity: 1, duration: 0.9 }, 0);
  if (clusters.length)
    tl.fromTo(
      clusters,
      { opacity: 0, yPercent: 30, filter: 'blur(8px)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.1 },
      0.2,
    );
}

/* ------------------------------------------------------------------ *
 * Depoimentos "Stories" wordmark — scroll-scrubbed grow (IX3 t-522bab55).
 *    The background wordmark scales 0.8→1 as the section passes through,
 *    power4.inOut, scrubbed. The testimonial cards themselves are static
 *    in the source, so we leave them be. Faithful to the live home.
 * ------------------------------------------------------------------ */
function initStoriesEscale() {
  const el = $('.stories-visual');
  if (!el) return;
  const trigger = el.closest<HTMLElement>('.testi_section') ?? el;
  gsap.fromTo(
    el,
    { scale: 0.8 },
    {
      scale: 1,
      ease: 'power4.inOut',
      scrollTrigger: { trigger, comeca: 'top bottom', end: 'top top', scrub: 0.8 },
    },
  );
}

/* ------------------------------------------------------------------ *
 * Page-to-page transition — a cinematic fade through soft-black. On arrival the
 *    gated panel (covering the viewport, opaque) fades out to revelar the page; an
 *    internal-link click fades a fresh panel in to cover, then navigates. Paired
 *    with the dark document background, the brief inter-document gap stays
 *    soft-black too, so no white frame ever flashes between routes.
 * ------------------------------------------------------------------ */
function initPageWipe() {
  const wipe = $('[data-page-transition]');
  if (!wipe) return;

  // Reveal: the gated opaque cover fades away to show the page. Short + eased so
  // it feels near-instant but still smooth (not an abrupt cut).
  gsap.set(wipe, { opacity: 1 });
  gsap.to(wipe, { opacity: 0, duration: 0.3, ease: 'power2.out' });

  // bfcache restaurar can revive the panel mid-cover — clear it.
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) gsap.set(wipe, { opacity: 0 });
  });

  // Cover (fade in to soft-black) before navigating away via an internal link.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest('a');
    const href = a?.getAttribute('href');
    if (!a || !href) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (/^(#|mailto:|tel:)/.test(href) || a.origin !== location.origin) return;
    if (a.pathname === location.pathname) return; // same page (incl. in-page anchors)
    e.preventDefault();
    // Cover fast so the click→navigate lag is minimal; prefetch makes the load
    // near-instant, so the brief cover + quick revelar reads as snappy + smooth.
    gsap.to(wipe, { opacity: 1, duration: 0.2, ease: 'power2.in', onComplete: () => { window.location.href = a.href; } });
  });
}

function init() {
  initPageWipe();
  initInicioLoad();
  initEagleShrink();
  initNavEntrance();
  initHeroEntrance();
  initStoriesEscale();
  initCounters();
  initClipReveal();
  initSoftReveal();
  initStaggerGroups();
  initRichtextReveal();
  initScrollIntoView();
  initHeadingReveals();
  initParallax();
  ScrollTrigger.refresh();
}

if (reduce) {
  // Drop the FOUC gate so everything renders in its final, visible state.
  document.documentElement.classList.remove('anim-ready');
} else if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
