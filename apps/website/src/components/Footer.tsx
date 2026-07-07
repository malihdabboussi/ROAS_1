import Link from 'next/link'
import { Instagram, Linkedin, Youtube } from 'lucide-react'
import { SiteLogo } from '@/components/SiteLogo'

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
  </svg>
)

const socialLinks = [
  {
    href: 'https://x.com/usevibey',
    label: 'X (Twitter)',
    Icon: XIcon,
  },
  {
    href: 'https://www.instagram.com/vibey.im/',
    label: 'Instagram',
    Icon: Instagram,
  },
  {
    href: 'https://www.linkedin.com/company/usevibey',
    label: 'LinkedIn',
    Icon: Linkedin,
  },
  {
    href: 'https://www.youtube.com/@usevibey',
    label: 'YouTube',
    Icon: Youtube,
  },
] as const

const footerColumns: {
  title: string
  links: { href: string; label: string; coming?: boolean; external?: boolean }[]
}[] = [
  {
    title: 'Product',
    links: [
      { href: '/features/studio', label: 'Features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: 'https://docs.vibey.im', label: 'Documentation', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/refund', label: 'Refund Policy' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden pb-10 pt-10">
      <div className="hero-dot-grid absolute inset-0 opacity-25" />
      <div className="site-container relative">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="shrink-0 lg:mr-6 lg:max-w-[200px]">
            <div className="mb-4 flex items-center">
              <SiteLogo className="!h-10" />
            </div>
            <p className="text-color-muted body-3 leading-relaxed">
              Your whole team. Humans and agents. One place.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-color-muted transition-colors hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h4 className="body-3-medium mb-3 uppercase tracking-wide text-white">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {'external' in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-color-muted body-3 transition-colors hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-color-muted body-3 transition-colors hover:text-white"
                        >
                          {link.label}
                          {link.coming && (
                            <span className="text-secondary-soft body-4 ml-1.5">Soon</span>
                          )}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
