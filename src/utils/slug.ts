/** Slugify a string for use in a URL (e.g. "Ben Turner" → "ben-turner").
    Lowercases, strips accents, removes apostrophes/quotes (so "You're" → "youre",
    matching Webflow's CMS slug behaviour), and collapses any run of remaining
    non-alphanumerics to a single hyphen. Used to key the detail pages. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
