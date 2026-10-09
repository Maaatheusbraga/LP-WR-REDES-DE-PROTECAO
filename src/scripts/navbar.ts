/*
  Navbar: fullscreen overlay menu toggle + scroll state.

  - The MENU button opens/closes the overlay panel by toggling `data-menu` on the
    nav root. CSS drives the panel slide + backdrop fade (see components.css).
  - Clicking the backdrop, pressing Escape, or following a link closes it.
  - On scroll past the hero, the nav switches to its solid state (`data-scrolled`).
  - Body scroll is locked while the menu is open.
*/
const nav = document.querySelector<HTMLElement>('[data-nav]');

if (nav) {
  const toggle = nav.querySelector<HTMLElement>('[data-menu-toggle]');
  const overlay = nav.querySelector<HTMLElement>('.nav_overlay');
  const links = nav.querySelectorAll<HTMLAnchorElement>('.menu_content a');

  const setOpen = (open: boolean) => {
    nav.dataset.menu = open ? 'open' : 'closed';
    toggle?.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    // The home "EAGLE" wordmark is a body-level overlay above the nav (z 1002)
    // for the scroll-shrink. Flag the open state on <html> so CSS can drop it
    // behind the dropdown — it stays visible as a background wordmark while the
    // menu links/image sit on top.
    document.documentElement.classList.toggle('menu-open', open);
  };

  setOpen(false);

  toggle?.addEventListener('click', () => setOpen(nav.dataset.menu !== 'open'));
  overlay?.addEventListener('click', () => setOpen(false));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.dataset.menu === 'open') setOpen(false);
  });

  // Solid nav state once scrolled past a threshold.
  const onScroll = () => {
    nav.dataset.scrolled = window.scrollY > 40 ? 'true' : 'false';
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
