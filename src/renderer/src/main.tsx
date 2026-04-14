import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init as initGhosttyWeb } from 'ghostty-web'
import App from './App'

if (import.meta.env.DEV) {
  import('react-grab').then(({ init }) => init())
  import('react-grab/styles.css')
}

// Respect system dark mode preference
function applySystemTheme(): void {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', isDark)
}

applySystemTheme()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme)

// Why: ghostty-web must load its WASM module before any Terminal instances
// can be created. Initialization is awaited before mounting the React tree
// so that terminal creation in pane-lifecycle.ts never races the WASM load.
initGhosttyWeb().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
