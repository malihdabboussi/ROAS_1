export type ProcessOperation =
  | 'trim'
  | 'concat'
  | 'convert'
  | 'extract_audio'
  | 'add_audio'
  | 'resize'
  | 'compose'
  | 'audio_effect'
  | 'color_grade'
  | 'blur'
  | 'vignette'
  | 'sharpen'
  | 'denoise'
  | 'reverse'
  | 'loop'
  | 'probe'
  | 'speed'
  | 'overlay'
  | 'crop'
  | 'thumbnail'
  | 'text_overlay'
  | 'transition'
  | 'chroma_key'
  | 'split_screen'
  | 'subtitle_burn'
  | 'silence_remove'
  | 'frame_extract'
  | 'waveform'
  | 'render_validate_messaging'
  | 'render_ig_story'
  | 'render_static_ad'

export const VALID_PROCESS_MEDIA_OPERATIONS = new Set<ProcessOperation>([
  'trim',
  'concat',
  'convert',
  'extract_audio',
  'add_audio',
  'resize',
  'compose',
  'audio_effect',
  'color_grade',
  'blur',
  'vignette',
  'sharpen',
  'denoise',
  'reverse',
  'loop',
  'probe',
  'speed',
  'overlay',
  'crop',
  'thumbnail',
  'text_overlay',
  'transition',
  'chroma_key',
  'split_screen',
  'subtitle_burn',
  'silence_remove',
  'frame_extract',
  'waveform',
  'render_validate_messaging',
  'render_ig_story',
  'render_static_ad',
])
