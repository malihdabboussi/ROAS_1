export const APP_THEME_STORAGE_KEY = 'vibey-app-theme'

/** Inline boot script — keep storage key in sync with RootProviders. */
export function buildAppThemeBootScript(storageKey = APP_THEME_STORAGE_KEY): string {
  return `
(function(){try{
  var k=${JSON.stringify(storageKey)};
  var s=localStorage.getItem(k);
  var useDark=s==='dark';
  document.documentElement.classList.toggle('dark',useDark);
  document.documentElement.style.colorScheme=useDark?'dark':'light';
}catch(e){}})();
`
}
