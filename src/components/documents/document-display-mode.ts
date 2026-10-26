export const documentDisplayModes = ['normal', 'latex-source', 'latex-rendered'] as const

export type DocumentDisplayMode = (typeof documentDisplayModes)[number]

export function isDocumentDisplayMode(value: unknown): value is DocumentDisplayMode {
  return documentDisplayModes.some((mode) => mode === value)
}
