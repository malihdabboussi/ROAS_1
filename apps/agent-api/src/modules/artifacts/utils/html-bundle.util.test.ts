import { describe, expect, it } from 'vitest'
import {
  applyUniqueCandidateEdit,
  buildAnchorReplacement,
  bundleFileHasTweaks,
  getBundleMimeType,
  inferBundleFileRole,
  normalizeBundleFiles,
  sanitizeBundleFilePath,
} from './html-bundle.util'

describe('sanitizeBundleFilePath', () => {
  it('accepts relative bundle paths', () => {
    expect(sanitizeBundleFilePath('index.html')).toBe('index.html')
    expect(sanitizeBundleFilePath('shared/styles.css')).toBe('shared/styles.css')
    expect(sanitizeBundleFilePath(' assets/logo.png ')).toBe('assets/logo.png')
  })

  it('rejects absolute, traversal, and backslash paths', () => {
    expect(() => sanitizeBundleFilePath('/etc/passwd')).toThrow('Invalid bundle file path')
    expect(() => sanitizeBundleFilePath('../secret.html')).toThrow()
    expect(() => sanitizeBundleFilePath('a\\b.html')).toThrow()
    expect(() => sanitizeBundleFilePath('C:/windows')).toThrow()
    expect(() => sanitizeBundleFilePath('')).toThrow()
  })

  it('uses the provided label in errors', () => {
    expect(() => sanitizeBundleFilePath('/x', 'funnel')).toThrow('Invalid funnel file path')
    expect(() => sanitizeBundleFilePath('/x', 'presentation')).toThrow(
      'Invalid presentation file path',
    )
  })
})

describe('getBundleMimeType / inferBundleFileRole', () => {
  it('maps known extensions', () => {
    expect(getBundleMimeType('index.html')).toBe('text/html')
    expect(getBundleMimeType('styles.css')).toBe('text/css')
    expect(getBundleMimeType('deck.js')).toBe('text/javascript')
    expect(getBundleMimeType('data.json')).toBe('application/json')
    expect(getBundleMimeType('logo.svg')).toBe('image/svg+xml')
    expect(getBundleMimeType('notes.txt')).toBe('text/plain')
  })

  it('infers entry role for index.html and keeps explicit roles', () => {
    expect(inferBundleFileRole('index.html')).toBe('entry')
    expect(inferBundleFileRole('styles.css')).toBe('source')
    expect(inferBundleFileRole('styles.css', 'style')).toBe('style')
  })
})

describe('normalizeBundleFiles', () => {
  it('normalizes valid file lists', () => {
    const files = normalizeBundleFiles(
      [
        { path: 'index.html', content: '<!doctype html>' },
        { path: 'styles.css', content: 'body {}', role: 'style' },
      ],
      'funnel',
    )
    expect(files).toEqual([
      { path: 'index.html', content: '<!doctype html>', role: 'entry' },
      { path: 'styles.css', content: 'body {}', role: 'style' },
    ])
  })

  it('rejects empty content with labeled error', () => {
    expect(() => normalizeBundleFiles([{ path: 'index.html', content: '' }], 'funnel')).toThrow(
      'funnel file index.html content is required',
    )
  })
})

describe('applyUniqueCandidateEdit', () => {
  const content = '<h1>Hello</h1><p>World</p><p>World</p>'

  it('applies the first uniquely matching candidate', () => {
    const result = applyUniqueCandidateEdit(content, ['Hello'], 'Hi')
    expect(result).toMatchObject({ status: 'applied', candidate: 'Hello' })
    if (result.status === 'applied') {
      expect(result.nextContent).toContain('<h1>Hi</h1>')
    }
  })

  it('reports ambiguity when a candidate matches more than once', () => {
    const result = applyUniqueCandidateEdit(content, ['World'], 'Globe')
    expect(result).toMatchObject({ status: 'ambiguous', matches: 2 })
  })

  it('falls through non-matching candidates and reports not_found', () => {
    const result = applyUniqueCandidateEdit(content, ['Missing', ''], 'X')
    expect(result).toMatchObject({ status: 'not_found' })
  })
})

describe('buildAnchorReplacement / bundleFileHasTweaks', () => {
  it('injects a data-comment-anchor into the first tag', () => {
    expect(buildAnchorReplacement('<h1 class="x">Hi</h1>', 'hero')).toBe(
      '<h1 data-comment-anchor="hero" class="x">Hi</h1>',
    )
    expect(buildAnchorReplacement('<p>Hi</p>', 'a1')).toBe('<p data-comment-anchor="a1">Hi</p>')
  })

  it('detects tweak markers', () => {
    expect(bundleFileHasTweaks('/*EDITMODE-BEGIN*/{}/*EDITMODE-END*/')).toBe(true)
    expect(bundleFileHasTweaks('body {}')).toBe(false)
  })
})
