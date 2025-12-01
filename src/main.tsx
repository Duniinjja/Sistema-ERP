import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configurePersistenceAdapter } from './services/persistence'

const adapterMode = (import.meta.env.VITE_PERSISTENCE_ADAPTER as 'local' | 'memory' | 'indexeddb') ?? 'local'
configurePersistenceAdapter(adapterMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
