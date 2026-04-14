import { Terminal, FitAddon } from 'ghostty-web'
import type { ITerminalOptions } from 'ghostty-web'

import type { PaneManagerOptions, ManagedPaneInternal } from './pane-manager-types'
import type { DragReorderState } from './pane-drag-reorder'
import type { DragReorderCallbacks } from './pane-drag-reorder'
import { attachPaneDrag } from './pane-drag-reorder'
import { safeFit } from './pane-tree-ops'

// ---------------------------------------------------------------------------
// Pane creation, terminal open/close, addon management
// ---------------------------------------------------------------------------

function getTerminalUrlOpenHint(): string {
  return navigator.userAgent.includes('Mac')
    ? '⌘+click to open or ⇧⌘+click for system browser'
    : 'Ctrl+click to open or Shift+Ctrl+click for system browser'
}

export function createPaneDOM(
  id: number,
  options: PaneManagerOptions,
  dragState: DragReorderState,
  dragCallbacks: DragReorderCallbacks,
  onPointerDown: (id: number) => void,
  onMouseEnter: (id: number, event: MouseEvent) => void
): ManagedPaneInternal {
  // Create .pane container
  const container = document.createElement('div')
  container.className = 'pane'
  container.dataset.paneId = String(id)

  // Create .terminal-container — baseline layout (position, width, height, margin)
  // is CSS-driven (see main.css .terminal-container) so that the data-has-title
  // attribute override can shift the terminal down without racing safeFit().
  const terminalContainer = document.createElement('div')
  terminalContainer.className = 'terminal-container'
  container.appendChild(terminalContainer)

  // Build terminal options
  const userOpts = options.terminalOptions?.(id) ?? {}
  const terminalOpts: ITerminalOptions = {
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: 14,
    // Cross-platform fallback chain — ensures the terminal can always find a
    // usable monospace font regardless of OS, even if user settings haven't
    // loaded yet. macOS-only fonts are harmlessly skipped on other platforms.
    fontFamily:
      '"SF Mono", "Menlo", "Monaco", "Cascadia Mono", "Consolas", "DejaVu Sans Mono", "Liberation Mono", monospace',
    scrollback: 10000,
    allowTransparency: false,
    ...userOpts
  }

  const terminal = new Terminal(terminalOpts)
  const fitAddon = new FitAddon()
  const openLinkHint = getTerminalUrlOpenHint()

  // URL tooltip element — Ghostty-style bottom-left hint on hover
  const linkTooltip = document.createElement('div')
  linkTooltip.className = 'pane-link-tooltip'
  linkTooltip.classList.add('xterm-hover')
  linkTooltip.style.cssText =
    'display:none;position:absolute;bottom:4px;left:8px;z-index:40;' +
    'padding:5px 8px;border-radius:4px;font-size:11px;font-family:inherit;' +
    'color:#a1a1aa;background:rgba(24,24,27,0.85);border:1px solid rgba(63,63,70,0.6);' +
    'pointer-events:none;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'

  // Ghostty-style drag handle — appears at top of pane on hover when 2+ panes
  const dragHandle = document.createElement('div')
  dragHandle.className = 'pane-drag-handle'
  container.appendChild(dragHandle)
  attachPaneDrag(dragHandle, id, dragState, dragCallbacks)

  const pane: ManagedPaneInternal = {
    id,
    terminal,
    container,
    terminalContainer,
    linkTooltip,
    fitAddon
  }

  // Focus handler: clicking a pane makes it active and explicitly focuses
  // the terminal. We must call focus: true here because after DOM reparenting
  // (e.g. splitPane moves the original pane into a flex container), ghostty-web's
  // native click-to-focus on its internal textarea may not fire reliably.
  container.addEventListener('pointerdown', () => {
    onPointerDown(id)
  })

  // Focus-follows-mouse handler: when the setting is enabled, hovering a
  // pane makes it active. All gating (feature flag, drag-in-progress,
  // window focus, etc.) lives in the PaneManager callback — this layer
  // just forwards the event.
  container.addEventListener('mouseenter', (event) => {
    onMouseEnter(id, event)
  })

  return pane
}

/** Open terminal into its container and load addons. Must be called after the container is in the DOM. */
export function openTerminal(pane: ManagedPaneInternal): void {
  const { terminal, terminalContainer, linkTooltip, fitAddon } = pane

  // Open terminal into DOM
  terminal.open(terminalContainer)
  // Why: ghostty-web sets terminal.element to the parent element passed to
  // open(), so it is the same as terminalContainer.
  const linkTooltipContainer = terminal.element ?? terminalContainer
  linkTooltipContainer.appendChild(linkTooltip)

  // Load the FitAddon (ghostty-web bundles all rendering; no WebGL/search/
  // serialize/unicode addons needed).
  terminal.loadAddon(fitAddon)

  // Initial fit (deferred to ensure layout has settled)
  requestAnimationFrame(() => {
    safeFit(pane)
  })
}

export function disposePane(
  pane: ManagedPaneInternal,
  panes: Map<number, ManagedPaneInternal>
): void {
  try {
    pane.fitAddon.dispose()
  } catch {
    /* ignore */
  }
  try {
    pane.terminal.dispose()
  } catch {
    /* ignore */
  }
  panes.delete(pane.id)
}
