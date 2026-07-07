import Script from 'next/script'

const STORAGE_KEY = 'vibey-site-theme'

/** Runs before hydration to minimize theme flash — keep key in sync with WebsiteThemeProvider. */
export function WebsiteThemeBootScript() {
  const code = `
(function(){try{
  var k=${JSON.stringify(STORAGE_KEY)};
  var s=localStorage.getItem(k);
  var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  var useDark=s==='dark'||(s!=='light'&&(s===null||s==='system')&&prefersDark);
  document.documentElement.classList.toggle('dark',useDark);
}catch(e){}})();
`

  return <Script id="website-theme-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: code }} />
}
