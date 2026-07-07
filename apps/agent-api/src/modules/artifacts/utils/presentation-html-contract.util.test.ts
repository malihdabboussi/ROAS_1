import { describe, expect, it } from 'vitest'

import {
  formatPresentationContractIssues,
  validatePresentationFilesBeforeSave,
  verifyPresentationHtmlBundleContract,
} from './presentation-html-contract.util'

const validPresentationFiles = [
  {
    path: 'index.html',
    role: 'entry',
    content: [
      '<!doctype html>',
      '<html lang="en" data-vibey-theme-native="true">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=1280, initial-scale=1">',
      '<title>Launch Deck</title>',
      '<link rel="stylesheet" href="styles.css">',
      '</head>',
      '<body>',
      '<main class="deck">',
      '<section class="slide slide-cover" data-comment-anchor="slide-cover">',
      '<div class="safe"><h1 data-comment-anchor="headline">One clear idea.</h1></div>',
      '</section>',
      '</main>',
      '</body>',
      '</html>',
    ].join(''),
  },
  {
    path: 'styles.css',
    role: 'style',
    content: [
      '* { box-sizing: border-box; }',
      'html, body { margin: 0; width: 1280px; }',
      '.deck { width: 1280px; margin: 0; }',
      '.slide { position: relative; width: 1280px; height: 720px; overflow: hidden; }',
      '.safe { width: 1040px; height: 560px; margin: 80px auto; }',
    ].join('\n'),
  },
]

describe('presentation HTML contract utilities', () => {
  it('blocks saving a full bundle without an index.html entry', () => {
    const report = validatePresentationFilesBeforeSave([
      { path: 'styles.css', role: 'style', content: '.slide { width: 1280px; }' },
    ])

    expect(report.valid).toBe(false)
    expect(report.blockingIssues).toEqual([
      expect.objectContaining({ code: 'PRESENTATION_ENTRY_MISSING' }),
    ])
    expect(formatPresentationContractIssues(report.blockingIssues)).toContain('index.html')
  })

  it('blocks saving malformed CSS before persistence', () => {
    const report = validatePresentationFilesBeforeSave([
      { path: 'index.html', role: 'entry', content: '<!doctype html><body>Deck</body>' },
      { path: 'styles.css', role: 'style', content: '.slide { width: 1280px;' },
    ])

    expect(report.valid).toBe(false)
    expect(report.blockingIssues).toEqual([
      expect.objectContaining({
        code: 'PRESENTATION_FILE_INVALID',
        path: 'styles.css',
      }),
    ])
  })

  it('passes a fixed-stage theme-native deck contract', () => {
    const report = verifyPresentationHtmlBundleContract({ files: validPresentationFiles })

    expect(report.valid).toBe(true)
    expect(report.repairIssues).toEqual([])
  })

  it('flags responsive webpage patterns after save so the agent repairs the bundle', () => {
    const files = validPresentationFiles.map((file) =>
      file.path === 'styles.css'
        ? {
            ...file,
            content:
              '.deck { width: 100vw; } .slide { min-height: 100vh; } .cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }',
          }
        : file,
    )

    const report = verifyPresentationHtmlBundleContract({ files })

    expect(report.valid).toBe(false)
    expect(report.repairIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PRESENTATION_FIXED_STAGE_MISSING' }),
        expect.objectContaining({ code: 'PRESENTATION_REFLOW_PATTERN' }),
      ]),
    )
  })

  it('flags missing local bundle references after save', () => {
    const files = [
      {
        ...validPresentationFiles[0]!,
        content: String(validPresentationFiles[0]!.content).replace('styles.css', 'missing.css'),
      },
      validPresentationFiles[1]!,
    ]

    const report = verifyPresentationHtmlBundleContract({ files })

    expect(report.valid).toBe(false)
    expect(report.repairIssues).toEqual([
      expect.objectContaining({ code: 'PRESENTATION_LOCAL_REF_MISSING' }),
    ])
  })
})
