export const ARTIFACT_LIBRARY_MESSAGES = {
  title: 'ALL ARTIFACTS',
  subtitle: 'Everything your agency has produced, across all campaigns and Spaces.',
  searchPlaceholder: 'Search all artifacts…',
  loading: 'Loading artifacts…',
  empty: 'No artifacts yet',
  emptySearch: 'No artifacts match your search',
} as const

export const ARTIFACT_LIBRARY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'docs', label: 'Docs' },
  { id: 'images', label: 'Images' },
  { id: 'sheets', label: 'Sheets' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'artifacts', label: 'Campaign assets' },
  { id: 'files', label: 'Files' },
] as const

export const ARTIFACT_LIBRARY_SOURCE_FILTERS = [
  { id: 'created', label: 'Created', description: 'Docs, generated media, and campaign assets' },
  { id: 'uploaded', label: 'Uploaded', description: 'Files uploaded to the account' },
  { id: 'all', label: 'Everything', description: 'Created and uploaded assets' },
] as const
