// Resolve a recipe image reference to a usable URL. Absolute URLs and data/blob
// URLs pass through; relative paths resolve against the app's base path so the
// app works both locally and under a GitHub Pages sub-path.
export function resolveAsset(ref: string): string {
  if (/^(https?:|data:|blob:)/.test(ref)) return ref
  const base = import.meta.env.BASE_URL // always ends with "/"
  return base + ref.replace(/^\//, '')
}
