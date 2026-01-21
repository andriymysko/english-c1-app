import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // <--- AQUESTA LÍNIA ÉS LA CLAU! 🔑
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)