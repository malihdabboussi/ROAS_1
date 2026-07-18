import { describe, expect, it } from 'vitest'
import { countPresentationSlides } from './presentation-slide-count'

describe('countPresentationSlides', () => {
  it('counts only section elements whose class list contains slide', () => {
    expect(
      countPresentationSlides(`
        <main class="deck">
          <section class="slide hero"></section>
          <section class="proof slide"></section>
          <section class="notes"></section>
        </main>
      `),
    ).toBe(2)
  })

  it('supports single-quoted and unquoted class attributes', () => {
    expect(
      countPresentationSlides("<section class='slide'></section><section class=slide></section>"),
    ).toBe(2)
  })

  it('returns zero for empty or non-slide HTML', () => {
    expect(countPresentationSlides('')).toBe(0)
    expect(countPresentationSlides('<main><section></section></main>')).toBe(0)
  })
})
