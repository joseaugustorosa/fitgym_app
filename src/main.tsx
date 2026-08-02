import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initColorMode } from './lib/colorMode'
import './index.css'
import App from './App.tsx'

initColorMode()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
