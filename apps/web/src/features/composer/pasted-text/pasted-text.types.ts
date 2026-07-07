export type PastedTextBlock = {
  id: string
  text: string
}

export type PastedTextPersistence =
  | { mode: 'zustand'; contextKey: string }
  | { mode: 'localStorage'; draftKey: string }
