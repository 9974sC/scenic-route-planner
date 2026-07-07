/** Runs before paint to avoid a flash of the wrong theme. */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var key = 'scenic-theme';
    var theme = localStorage.getItem(key);
    var dark =
      theme === 'dark' ||
      (theme !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
