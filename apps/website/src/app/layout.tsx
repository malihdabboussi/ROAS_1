import type { Metadata } from 'next'
import { Handjet, JetBrains_Mono, MuseoModerno, Noto_Sans_Sora_Sompeng } from 'next/font/google'
import Script from 'next/script'
import { GoogleAnalytics as GA4 } from '@next/third-parties/google'
import { MetaPixelPageView } from '@/components/MetaPixelPageView'
import { MicrosoftClarity } from '@/components/MicrosoftClarity'
import { WebsiteShell } from '@/components/WebsiteShell'
import { WebsiteThemeBootScript } from '@/components/WebsiteThemeBootScript'
import { WebsiteThemeProvider } from '@/components/WebsiteThemeProvider'
import './globals.css'

const META_PIXEL_ID = '2131475027603018'

const fontHeadline = MuseoModerno({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-site-headline',
  display: 'swap',
})

const fontBody = Noto_Sans_Sora_Sompeng({
  subsets: ['latin', 'latin-ext', 'sora-sompeng'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-site-body',
  display: 'swap',
})

const fontSmall = Handjet({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-site-small',
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-site-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ROAS — AI Operating System for Your Business',
  description:
    'A team of specialist AI agents that execute your business: build funnels, run ads, send email sequences, manage missions, and operate autonomously with persistent memory.',
  metadataBase: new URL('https://vibey.im'),
  openGraph: {
    title: 'ROAS — AI Operating System for Your Business',
    description:
      'A team of specialist AI agents that execute your business: build funnels, run ads, send email sequences, manage missions, and operate autonomously with persistent memory.',
    url: 'https://vibey.im',
    siteName: 'ROAS',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/Logos/logov2/icon-text-white.png',
        width: 1200,
        height: 630,
        alt: 'ROAS — AI Operating System for Your Business',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@usevibey',
    title: 'ROAS — AI Operating System for Your Business',
    description:
      'A team of specialist AI agents that execute your business: build funnels, run ads, send email sequences, manage missions, and operate autonomously.',
    images: ['/Logos/logov2/icon-text-white.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/Logos/logov2/icon-white.png', media: '(prefers-color-scheme: dark)' },
      { url: '/Logos/logov2/icon-black.png', media: '(prefers-color-scheme: light)' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontHeadline.variable} ${fontBody.variable} ${fontSmall.variable} ${fontMono.variable}`}
    >
      <body className={fontBody.className}>
        <WebsiteThemeBootScript />
        <noscript>
          <img
            height={1}
            width={1}
            className="hidden"
            alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
`}
        </Script>
        <MicrosoftClarity />
        <WebsiteThemeProvider>
          <WebsiteShell>
            <MetaPixelPageView />
            {children}
          </WebsiteShell>
        </WebsiteThemeProvider>
        <GA4 gaId="G-D60YDGY3ZK" />

      </body>
    </html>
  )
}
