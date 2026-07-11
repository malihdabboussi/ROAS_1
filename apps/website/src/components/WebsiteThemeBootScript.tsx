import Script from 'next/script'

const STORAGE_KEY = 'vibey-site-theme'

/** Runs before hydration to minimize theme flash — keep key in sync with WebsiteThemeProvider. */
export function WebsiteThemeBootScript() {
  const code = `
(function(){try{
  var k=${JSON.stringify(STORAGE_KEY)};
  var s=localStorage.getItem(k);
  var useDark=s==='dark';
  document.documentElement.classList.toggle('dark',useDark);
  document.documentElement.style.colorScheme=useDark?'dark':'light';
}catch(e){}})();
`

  return <Script id="website-theme-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: code }} />
}
