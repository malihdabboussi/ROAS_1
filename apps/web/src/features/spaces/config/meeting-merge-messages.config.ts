export const MEETING_MERGE_MESSAGES = {
  PANEL_TITLE: (count: number) => `Merge ${count} meetings`,
  PANEL_DESCRIPTION:
    'Pick the meeting to keep. Recordings, action items, and notes from the others move onto it — the duplicate rows go away.',
  HAS_RECORDING: 'Has recording',
  CONFIRM: 'Merge meetings',
  CANCEL: 'Cancel',
  SUCCESS: (mergedCount: number) =>
    `Merged ${mergedCount} duplicate${mergedCount === 1 ? '' : 's'} into one meeting`,
  FAILED: 'Could not merge those meetings. Try again.',
} as const
