/**
 * Determine which zoom domain (terminal, editor, or UI) should be adjusted
 * based on current view, tab type, and focused element.
 */
export function resolveZoomTarget(args: {
  activeView: 'terminal' | 'settings'
  activeTabType: 'terminal' | 'editor' | 'browser'
  activeElement: unknown
}): 'terminal' | 'editor' | 'ui' {
  const { activeView, activeTabType, activeElement } = args
  // Why: ghostty-web uses a hidden <textarea> inside .terminal-container for
  // keyboard input (replacing xterm's .xterm-helper-textarea class convention).
  const terminalInputFocused =
    typeof activeElement === 'object' &&
    activeElement !== null &&
    'closest' in activeElement &&
    typeof (activeElement as { closest?: unknown }).closest === 'function' &&
    (activeElement as { closest: (selector: string) => Element | null }).closest(
      '.terminal-container'
    ) !== null
  const editorFocused =
    typeof activeElement === 'object' &&
    activeElement !== null &&
    'closest' in activeElement &&
    typeof (activeElement as { closest?: unknown }).closest === 'function' &&
    Boolean(
      (
        activeElement as {
          closest: (selector: string) => Element | null
        }
      ).closest(
        '.monaco-editor, .diff-editor, .markdown-preview, .rich-markdown-editor, .rich-markdown-editor-shell'
      )
    )

  if (activeView !== 'terminal') {
    return 'ui'
  }
  if (activeTabType === 'editor' || editorFocused) {
    return 'editor'
  }
  // Why: terminal tabs should keep using per-pane terminal font zoom even when
  // focus leaves the terminal textarea (e.g. clicking tab bar/sidebar controls).
  // Falling back to UI zoom here would resize the whole app for a terminal-only
  // action and break parity with terminal zoom behavior.
  if (activeTabType === 'terminal' || terminalInputFocused) {
    return 'terminal'
  }
  return 'ui'
}
