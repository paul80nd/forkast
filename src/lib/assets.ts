// Resolve a recipe image reference to a usable URL.
// - Absolute (http/data/blob) URLs pass through untouched.
// - A bare filename (no slash), e.g. "10-min-asian-beef.jpg", is an imported recipe
//   image: it resolves to the private-images route served from disk (see the
//   `forkast-private-images` plugin in vite.config.ts). Configurable via
//   VITE_IMAGES_BASE; defaults to "<base>recipe-images/".
// - A path, e.g. "demo/images/x.svg", is a committed asset and resolves against the
//   app base path so it works under a GitHub Pages sub-path.
const IMAGES_BASE =
  import.meta.env.VITE_IMAGES_BASE ?? `${import.meta.env.BASE_URL}recipe-images/`

export function resolveAsset(ref: string): string {
  if (/^(https?:|data:|blob:)/.test(ref)) return ref
  if (!ref.includes('/')) return IMAGES_BASE + ref
  return import.meta.env.BASE_URL + ref.replace(/^\//, '')
}
