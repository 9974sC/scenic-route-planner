import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '@/lib/brand'

/** Runs before paint to avoid a flash of the wrong theme. */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var key = '${THEME_STORAGE_KEY}';
    var legacy = '${LEGACY_THEME_STORAGE_KEY}';
    var theme = localStorage.getItem(key) || localStorage.getItem(legacy);
    var dark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
