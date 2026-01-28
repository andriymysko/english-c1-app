import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import posthog from 'posthog-js'

// Importem les variables d'entorn
const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

// Comprovem que existeixen abans d'inicialitzar (bona pràctica)
if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only', 
      session_recording: {
          maskAllInputs: false,
          maskInputOptions: {
              password: true
          }
      }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)