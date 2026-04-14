import type { Terminal } from 'ghostty-web'

/**
 * Serialize terminal buffer content to a string of escape sequences and text.
 *
 * Why: ghostty-web does not ship a SerializeAddon. This helper iterates
 * through the terminal buffer to extract visible text content, capped at
 * the requested scrollback depth.  The output is plain text (not escape
 * sequences) which is sufficient for scrollback restoration via
 * terminal.write().
 */
export function serializeTerminalBuffer(
  terminal: Terminal,
  options: { scrollback?: number } = {}
): string {
  const buffer = terminal.buffer.active
  const totalRows = buffer.length
  const maxScrollback = options.scrollback ?? 10_000
  // Only serialize the last `maxScrollback` rows
  const startRow = Math.max(0, totalRows - maxScrollback)
  const lines: string[] = []

  for (let row = startRow; row < totalRows; row++) {
    const line = buffer.getLine(row)
    if (!line) {
      lines.push('')
      continue
    }
    lines.push(line.translateToString(true))
  }

  // Join with \r\n to preserve line breaks when replayed via terminal.write()
  return lines.join('\r\n')
}
