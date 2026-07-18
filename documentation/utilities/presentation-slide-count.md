# Presentation Slide Count

## Purpose

`countPresentationSlides` counts fixed-stage HTML presentation slides by finding `<section>` elements whose class list contains `slide`.

Modern presentations store their content in `presentation_files`, not in the legacy `presentations.slides` JSON field. Creation and file-update paths persist this count in `presentations.metadata.slide_count` so lightweight list responses can show an accurate count without loading every HTML bundle.

## Usage

```ts
import { countPresentationSlides } from '@vibey/api-shared'

const slideCount = countPresentationSlides(indexHtml)
```

Use the entry file selected by `metadata.entry_file`; default to `index.html` when it is absent.
