/** Single source for both the key handler (`useKeyboardShortcuts`) and the `?` help overlay, so they can't drift. */
export const SHORTCUTS = [
  { keys: ['Space'], label: 'Start / pause / resume' },
  { keys: ['S', '→'], label: 'Skip to next phase' },
  { keys: ['R'], label: 'Reset (end session)' },
  { keys: ['M'], label: 'Mute / unmute' },
  { keys: ['F'], label: 'Fullscreen' },
  { keys: ['H'], label: 'Training history' },
  { keys: ['?'], label: 'Show these shortcuts' },
  { keys: ['Esc'], label: 'Close this panel' },
] as const
