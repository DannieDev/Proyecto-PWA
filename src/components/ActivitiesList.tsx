import React, { useState, useEffect } from 'react';
import { dbService } from '../utils/db';
import type { Activity } from '../types/offline';

export const ActivitiesList: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    loadActivities();
    
    const handleOnline = () => {
      setIsOnline(true);
      attemptAutoSync();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_STARTED') {
        setIsSyncing(true);
      }
      
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        setIsSyncing(false);
        loadActivities();
        
        const { successful, failed } = event.data.payload;
        if (successful > 0) {
          console.log(`${successful} actividades sincronizadas y eliminadas`);
        }
        if (failed > 0) {
          console.log(`${failed} actividades fallaron al sincronizar`);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const loadActivities = async () => {
    try {
      const allActivities = await dbService.getAllActivities();
      const sortedActivities = allActivities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error cargando actividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const attemptAutoSync = async () => {
    if (!isOnline || activities.length === 0) return;
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'START_SYNC'
      });
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Necesitas conexión a internet para sincronizar');
      return;
    }

    if (activities.length === 0) {
      alert('No hay actividades pendientes para sincronizar');
      return;
    }

    setIsSyncing(true);
    
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'START_SYNC'
        });
      } else {
        alert('Service Worker no disponible');
      }
    } catch (error) {
      alert('Error al iniciar la sincronización');
      setIsSyncing(false);
    }
  };

  const deleteActivity = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
      await dbService.deleteActivity(id);
      await loadActivities();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="activities-list-container">
        <div className="loading">
          <p>Cargando reportes desde almacenamiento local...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activities-list-container">
      <div className="list-header">
        <h2>Reportes Guardados</h2>
        <div className="list-stats">
          <span className="total-count">Total: {activities.length} reportes</span>
          
          {activities.length > 0 && isOnline && (
            <button 
              onClick={handleManualSync} 
              className="sync-btn"
              disabled={isSyncing}
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          )}
          
          <span className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </div>

      {isSyncing && (
        <div className="sync-notice">
          <p>Sincronizando {activities.length} reporte{activities.length > 1 ? 's' : ''} con el servidor...</p>
          <p>Los reportes se eliminarán localmente después de sincronizar.</p>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="empty-state">
          <p>No hay reportes guardados aún.</p>
          <p>¡Comienza agregando tu primer reporte de actividades!</p>
          {!isOnline && (
            <div className="offline-info">
              <p><strong>Consejo:</strong> Puedes guardar reportes sin conexión y se sincronizarán automáticamente cuando tengas internet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="activities-grid">
          {activities.map(activity => (
            <div key={activity.id} className="activity-card">
              <div className="activity-header">
                <h3>{activity.studentName}</h3>
                <div className="activity-meta">
                  <span className="date">{formatDate(activity.date)}</span>
                  <span className="hours">⏱{activity.hours} hora{activity.hours > 1 ? 's' : ''}</span>
                  {!isOnline && (
                    <span className="offline-badge">Local</span>
                  )}
                </div>
              </div>
              
              <div className="activity-content">
                <p>{activity.activity}</p>
              </div>
              
              <div className="activity-footer">
                <small>
                  Guardado: {new Date(activity.createdAt).toLocaleString('es-MX')}
                  {!isOnline && (
                    <>
                      <br />
                      <span className="offline-notice-small">
                        Se sincronizará automáticamente con conexión
                      </span>
                    </>
                  )}
                </small>
                <button 
                  onClick={() => activity.id && deleteActivity(activity.id)}
                  className="delete-btn"
                  disabled={isSyncing}
                >
                  {isSyncing ? '...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="storage-notice">
        <p><strong>Información:</strong> Todos los reportes se guardan localmente en tu navegador usando IndexedDB.</p>
        <p>
          {activities.length > 0 
            ? isOnline
              ? `${activities.length} reporte${activities.length > 1 ? 's' : ''} listo${activities.length > 1 ? 's' : ''} para sincronizar con el servidor`
              : `${activities.length} reporte${activities.length > 1 ? 's' : ''} guardado${activities.length > 1 ? 's' : ''} localmente - Se sincronizarán automáticamente con conexión`
            : 'Todos los reportes han sido sincronizados con el servidor'
          }
        </p>
        {isOnline && activities.length > 0 && (
          <p className="sync-info">
            <strong>Sincronización automática:</strong> Los reportes se enviarán al servidor y se eliminarán localmente.
          </p>
        )}
      </div>
    </div>
  );
};