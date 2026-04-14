import type { Terminal } from 'ghostty-web'

/**
 * Buffer-based search helper for ghostty-web terminals.
 *
 * Why: ghostty-web does not ship a SearchAddon like xterm.js. This helper
 * iterates through the terminal buffer to find text matches and uses
 * terminal.select() to highlight them.
 */
export class TerminalSearchHelper {
  readonly terminal: Terminal
  private currentMatchIndex = -1
  private matches: { row: number; startCol: number; length: number }[] = []

  constructor(terminal: Terminal) {
    this.terminal = terminal
  }

  findNext(
    query: string,
    options: { caseSensitive?: boolean; regex?: boolean; incremental?: boolean } = {}
  ): boolean {
    this.updateMatches(query, options)
    if (this.matches.length === 0) {
      return false
    }
    if (options.incremental) {
      this.currentMatchIndex = 0
    } else {
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length
    }
    this.highlightMatch()
    return true
  }

  findPrevious(
    query: string,
    options: { caseSensitive?: boolean; regex?: boolean; incremental?: boolean } = {}
  ): boolean {
    this.updateMatches(query, options)
    if (this.matches.length === 0) {
      return false
    }
    this.currentMatchIndex =
      (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length
    this.highlightMatch()
    return true
  }

  clearDecorations(): void {
    this.terminal.clearSelection()
    this.matches = []
    this.currentMatchIndex = -1
  }

  private updateMatches(
    query: string,
    options: { caseSensitive?: boolean; regex?: boolean }
  ): void {
    const buffer = this.terminal.buffer.active
    const totalRows = buffer.length
    this.matches = []

    let pattern: RegExp
    if (options.regex) {
      try {
        pattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi')
      } catch {
        return
      }
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(escaped, options.caseSensitive ? 'g' : 'gi')
    }

    for (let row = 0; row < totalRows; row++) {
      const line = buffer.getLine(row)
      if (!line) continue
      const text = line.translateToString(false)
      let match: RegExpExecArray | null
      pattern.lastIndex = 0
      match = pattern.exec(text)
      while (match !== null) {
        this.matches.push({ row, startCol: match.index, length: match[0].length })
        match = pattern.exec(text)
      }
    }
  }

  private highlightMatch(): void {
    if (this.currentMatchIndex < 0 || this.currentMatchIndex >= this.matches.length) {
      return
    }
    const match = this.matches[this.currentMatchIndex]
    this.terminal.select(match.startCol, match.row, match.length)
    this.terminal.scrollToLine(match.row)
  }
}
