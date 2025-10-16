import { useState, useEffect } from 'react'
import { ActivityForm } from './components/ActivityForm'
import { ActivitiesList } from './components/ActivitiesList'
import './App.css'
import './styles/OfflineForm.css'

const VAPID_PUBLIC_KEY = 'BEs4VudqIVuiwhLWG7OytY7M3bcwNYGLnJCJiu7LkzguWkXt6p_JQ6xzchL3BMGw50sBCoooDZw-6LMjSqlwCbA';

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [currentView, setCurrentView] = useState<'home' | 'form' | 'list'>('home')
  const [showOfflinePage, setShowOfflinePage] = useState<boolean>(false)

  const [pushSupported, setPushSupported] = useState<boolean>(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

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

    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflinePage(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      if (!navigator.onLine) {
        setShowOfflinePage(true)
      }
    }

    if (!navigator.onLine) {
      setShowOfflinePage(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado: ', registration)
        })
        .catch((error) => {
          console.log('Error registrando Service Worker: ', error)
        })
    }

    checkPushSupport()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  const checkPushSupport = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      setNotificationPermission(Notification.permission)
      await checkExistingSubscription()
    }
  }

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()
      setSubscription(existingSubscription)

      if (existingSubscription) {
        console.log('Ya suscrito a notificaciones')
      }
    } catch (error) {
      console.error('Error verificando suscripción:', error)
    }
  }

  const subscribeToNotifications = async () => {
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission !== 'granted') {
        alert('Los permisos de notificación son necesarios para recibir alertas importantes.')
        return
      }

      const registration = await navigator.serviceWorker.ready

      // Cambia el nombre de la variable local
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      setSubscription(newSubscription)


      await sendSubscriptionToBackend(newSubscription)

      alert('¡Notificaciones activadas! Recibirás alertas importantes.')

    } catch (error) {
      console.error('Error suscribiendo a notificaciones:', error)
      alert('Error activando notificaciones. Intenta nuevamente.')
    }
  }

  const unsubscribeFromNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()

      if (existingSubscription) {
        await existingSubscription.unsubscribe()
        setSubscription(null)
        alert('Notificaciones desactivadas.')
      }
    } catch (error) {
      console.error('Error cancelando suscripción:', error)
    }
  }

 function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  
  const buffer = new ArrayBuffer(rawData.length)
  const bytes = new Uint8Array(buffer)
  
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i)
  }
  
  return buffer
}

async function sendSubscriptionToBackend(subscription: PushSubscription) {
  try {
    console.log('Enviando suscripción al backend:', subscription);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.log('No se pudo conectar al backend, pero la suscripción está activa localmente')
  }
}

  const testNotification = async () => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready

      registration.showNotification('Why? - Prueba Exitosa', {
        body: '¡Las notificaciones push están funcionando correctamente! Ahora recibirás alertas importantes.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'test-notification'
      })
    } else {
      alert('Primero activa las notificaciones o verifica los permisos.')
    }
  }

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

  if (showOfflinePage) {
    return (
      <div className="offline-page">
        <div className="offline-container">
          <h1>¡Ups! Sin Conexión</h1>
          <p>No tenemos conexión a internet en este momento. Pero no te preocupes, tus datos están guardados localmente.</p>
          <p>Puedes seguir usando la aplicación de forma limitada y tus cambios se sincronizarán cuando recuperes la conexión.</p>
          <div className="offline-actions">
            <button
              className="offline-btn"
              onClick={() => setShowOfflinePage(false)}
            >
              Intentar usar la app
            </button>
            <button
              className="offline-btn secondary"
              onClick={() => window.location.reload()}
            >
              Reintentar conexión
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return (
          <div className="content-section">
            <ActivityForm />
          </div>
        )
      case 'list':
        return (
          <div className="content-section">
            <ActivitiesList />
          </div>
        )
      default:
        return (
          <div className="content-section">
            <div className="home-content">
              <h2>Bienvenido a Why?</h2>
              <div className="features">
                <div className="feature">
                  <h3>Crear Reportes</h3>
                  <p>Guarda actividades educativas incluso sin internet</p>
                </div>
                <div className="feature">
                  <h3>Sincronización Automática</h3>
                  <p>Los datos se envían automáticamente cuando hay conexión</p>
                </div>
                <div className="feature">
                  <h3>Almacenamiento Local</h3>
                  <p>Tus datos están seguros en tu dispositivo</p>
                </div>
                <div className="feature">
                  <h3>Instalable</h3>
                  <p>Instala la app en tu dispositivo como una app nativa</p>
                </div>
                <div className="feature">
                  <h3>Notificaciones Push</h3>
                  <p>Recibe alertas importantes incluso con la app cerrada</p>
                </div>
              </div>

              {/* Sección de controles de notificación en el home */}
              <div className="notification-section">
                <h3>Configuración de Notificaciones</h3>
                <div className="notification-controls">
                  {pushSupported ? (
                    <div className="notification-status">
                      {notificationPermission === 'granted' && subscription ? (
                        <div className="notification-active">
                          <p>Notificaciones activadas</p>
                          <div className="notification-buttons">
                            <button
                              className="notification-btn active"
                              onClick={unsubscribeFromNotifications}
                            >
                              Desactivar Notificaciones
                            </button>
                            <button
                              className="notification-btn test"
                              onClick={testNotification}
                            >
                              Probar Notificación
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="notification-inactive">
                          <button
                            className="notification-btn"
                            onClick={subscribeToNotifications}
                          >
                            Activar Notificaciones
                          </button>
                          {notificationPermission === 'denied' && (
                            <p className="notification-warning">
                              Los permisos están bloqueados. Ve a configuración del navegador para habilitarlos.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="notification-unsupported">
                      Tu navegador no soporta notificaciones push
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <h1>Why?</h1>
          <div className="status-indicators">
            <span className={`status ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>

            {/* Controles de notificación en el header */}
            {pushSupported && notificationPermission === 'granted' && subscription && (
              <button
                className="notification-header-btn"
                onClick={testNotification}
                title="Probar notificación"
              >
                Probar
              </button>
            )}

            {showInstallButton && (
              <button className="install-btn" onClick={handleInstallClick}>
                Instalar App
              </button>
            )}
          </div>
        </div>

        {/* Navegación principal */}
        <nav className="main-nav">
          <button
            onClick={() => setCurrentView('home')}
            className={currentView === 'home' ? 'active' : ''}
          >
            Inicio
          </button>
          <button
            onClick={() => setCurrentView('form')}
            className={currentView === 'form' ? 'active' : ''}
          >
            Nuevo Reporte
          </button>
          <button
            onClick={() => setCurrentView('list')}
            className={currentView === 'list' ? 'active' : ''}
          >
            Ver Actividades
          </button>
        </nav>
      </header>

      <main className="app-main">
        {renderContent()}
      </main>

      <footer className="app-footer">
        <p>© 2025 Why?</p>
      </footer>
    </div>
  )
}

export default App