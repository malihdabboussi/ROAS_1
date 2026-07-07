import { toast } from 'sonner'
import { sanitizeFilename, stampMadeWithVibeyFooterOnAllPages } from '@/lib/artifacts'

export async function exportEmailArtifactPdf(subject: string, bodyHtml: string): Promise<void> {
  const basename = sanitizeFilename(subject, 'email')
  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-100000px;top:0;width:186mm;opacity:0;pointer-events:none'
  host.setAttribute('aria-hidden', 'true')

  const root = document.createElement('div')
  root.style.cssText = 'font-family:system-ui,sans-serif;color:#111;line-height:1.6'
  const heading = document.createElement('h2')
  heading.style.cssText = 'font-size:16px;font-weight:700;margin:0 0 12px'
  heading.textContent = subject || 'Untitled Email'
  root.appendChild(heading)
  const body = document.createElement('div')
  body.style.cssText = 'font-size:13px'
  body.innerHTML = bodyHtml || ''
  root.appendChild(body)
  host.appendChild(root)
  document.body.appendChild(host)

  try {
    await new Promise((r) => setTimeout(r, 200))
    const html2pdf = (await import('html2pdf.js')).default
    const opt = {
      margin: [12, 12, 18, 12] as [number, number, number, number],
      filename: `${basename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }
    const worker = (html2pdf() as any).set(opt)['from'](root)
    await worker.toPdf()
    const pdf = await worker.get('pdf')
    stampMadeWithVibeyFooterOnAllPages(pdf)
    await worker.save()
  } catch {
    toast.error('Failed to export email as PDF')
  } finally {
    host.parentNode?.removeChild(host)
  }
}
