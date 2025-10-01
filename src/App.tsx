import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    })

    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada exitosamente')
      setShowInstallButton(false)
    })

    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado: ', registration)
        })
        .catch((error) => {
          console.log('Error registrando Service Worker: ', error)
        })
    }
  }, [])

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuario aceptó instalar la PWA')
        }
        setDeferredPrompt(null)
        setShowInstallButton(false)
      })
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <h1>Mi PWA con React</h1>
          <div className="status-indicators">
            <span className={`status ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
            {showInstallButton && (
              <button className="install-btn" onClick={handleInstallClick}>
                Instalar App
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="content-section">
          <div>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <h1>Vite + React + PWA</h1>
          <div className="card">
            <button onClick={() => setCount((count) => count + 1)}>
              count is {count}
            </button>
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">
            Click on the Vite and React logos to learn more
          </p>
        </div>
      </main>
      
      <footer className="app-footer">
        <p>© 2024 Mi PWA - Actividad de Componentes Esenciales</p>
      </footer>
    </div>
  )
}

export default App