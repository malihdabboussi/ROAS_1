"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const presentation_slide_count_1 = require("./presentation-slide-count");
(0, vitest_1.describe)('countPresentationSlides', () => {
    (0, vitest_1.it)('counts only section elements whose class list contains slide', () => {
        (0, vitest_1.expect)((0, presentation_slide_count_1.countPresentationSlides)(`
        <main class="deck">
          <section class="slide hero"></section>
          <section class="proof slide"></section>
          <section class="notes"></section>
        </main>
      `)).toBe(2);
    });
    (0, vitest_1.it)('supports single-quoted and unquoted class attributes', () => {
        (0, vitest_1.expect)((0, presentation_slide_count_1.countPresentationSlides)("<section class='slide'></section><section class=slide></section>")).toBe(2);
    });
    (0, vitest_1.it)('returns zero for empty or non-slide HTML', () => {
        (0, vitest_1.expect)((0, presentation_slide_count_1.countPresentationSlides)('')).toBe(0);
        (0, vitest_1.expect)((0, presentation_slide_count_1.countPresentationSlides)('<main><section></section></main>')).toBe(0);
    });
});
//# sourceMappingURL=presentation-slide-count.test.js.map