import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './main.css'

window.addEventListener('unhandledrejection', (event) => {
  console.error('[PDV] Promessa rejeitada sem tratamento', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary area="aplicativo" variant="fullscreen">
    <App />
  </ErrorBoundary>,
)
