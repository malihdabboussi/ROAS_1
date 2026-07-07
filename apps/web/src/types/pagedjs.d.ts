declare module 'pagedjs' {
  export class Polisher {
    destroy(): void
  }

  export class Previewer {
    constructor(options?: Record<string, unknown>)
    polisher: Polisher
    preview(
      content: string | DocumentFragment | HTMLElement | null | undefined,
      stylesheets?: Array<Record<string, string> | string>,
      renderTo?: HTMLElement | string | null,
    ): Promise<{ total: number; performance?: number }>
  }
}
