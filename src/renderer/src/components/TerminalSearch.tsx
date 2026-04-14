import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, X, CaseSensitive, Regex } from 'lucide-react'
import type { Terminal } from 'ghostty-web'
import { Button } from '@/components/ui/button'
import type { SearchState } from '@/components/terminal-pane/keyboard-handlers'
import { TerminalSearchHelper } from '@/lib/terminal-search-helper'

type TerminalSearchProps = {
  isOpen: boolean
  onClose: () => void
  terminal: Terminal | null
  searchStateRef: React.RefObject<SearchState>
}

export default function TerminalSearch({
  isOpen,
  onClose,
  terminal,
  searchStateRef
}: TerminalSearchProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regex, setRegex] = useState(false)
  const searchHelperRef = useRef<TerminalSearchHelper | null>(null)

  // Lazily create/update search helper when the terminal instance changes
  if (terminal && searchHelperRef.current?.terminal !== terminal) {
    searchHelperRef.current = new TerminalSearchHelper(terminal)
  }
  if (!terminal) {
    searchHelperRef.current = null
  }

  const findNext = useCallback(() => {
    if (searchHelperRef.current && query) {
      searchHelperRef.current.findNext(query, { caseSensitive, regex })
    }
  }, [query, caseSensitive, regex])

  const findPrevious = useCallback(() => {
    if (searchHelperRef.current && query) {
      searchHelperRef.current.findPrevious(query, { caseSensitive, regex })
    }
  }, [query, caseSensitive, regex])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    } else {
      searchHelperRef.current?.clearDecorations()
    }
  }, [isOpen])

  useEffect(() => {
    // Keep the ref in sync so the keyboard handler (Cmd+G / Cmd+Shift+G)
    // can read the current search state without lifting it to parent state.
    searchStateRef.current = { query, caseSensitive, regex }

    if (!query) {
      searchHelperRef.current?.clearDecorations()
      return
    }
    if (searchHelperRef.current && isOpen) {
      searchHelperRef.current.findNext(query, { caseSensitive, regex, incremental: true })
    }
  }, [query, isOpen, caseSensitive, regex, searchStateRef])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation()

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.shiftKey) {
        findPrevious()
      } else if (e.key === 'Enter') {
        findNext()
      }
    },
    [onClose, findNext, findPrevious]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div
      data-terminal-search-root
      className="absolute top-2 right-2 z-50 flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/95 px-2 py-1 shadow-lg backdrop-blur-sm"
      style={{ width: 300 }}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="min-w-0 flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setCaseSensitive((v) => !v)}
        className={`flex size-6 shrink-0 items-center justify-center rounded ${
          caseSensitive ? 'bg-zinc-700/50 text-blue-400' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        title="Case sensitive"
      >
        <CaseSensitive size={14} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setRegex((v) => !v)}
        className={`flex size-6 shrink-0 items-center justify-center rounded ${
          regex ? 'bg-zinc-700/50 text-blue-400' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        title="Regex"
      >
        <Regex size={14} />
      </Button>

      <div className="mx-0.5 h-4 w-px bg-zinc-700" />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={findPrevious}
        className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-200"
        title="Previous match"
      >
        <ChevronUp size={14} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={findNext}
        className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-200"
        title="Next match"
      >
        <ChevronDown size={14} />
      </Button>

      <div className="mx-0.5 h-4 w-px bg-zinc-700" />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onClose}
        className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-200"
        title="Close"
      >
        <X size={14} />
      </Button>
    </div>
  )
}
