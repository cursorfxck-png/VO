import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// ── Lenis smooth scroll ───────────────────────────────────────────────────────
// Applied to the main window scroll (feed, explore, profiles).
// Messages use their own overflow-y:auto container — Lenis doesn't touch them.
import Lenis from 'lenis'

const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false, // Keep native feel on mobile touch
  syncTouch: false,
})

function rafLoop(time) {
  lenis.raf(time)
  requestAnimationFrame(rafLoop)
}
requestAnimationFrame(rafLoop)

// Expose so child components can stop/start if needed (e.g. modals)
window.__lenis = lenis
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Register Service Worker for Offline Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration)
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error)
      })
  })
}
