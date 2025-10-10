// Utilidades para Background Sync API
class SyncUtils {
  // Verificar si Background Sync está soportado
  isBackgroundSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'SyncManager' in window;
  }

  // Registrar sync para actividades offline
  async registerActivitySync(): Promise<boolean> {
    if (!this.isBackgroundSyncSupported()) {
      console.warn('❌ Background Sync no soportado en este navegador');
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (!registration.sync) {
        console.warn('❌ SyncManager no disponible en este Service Worker');
        return false;
      }
      
      await registration.sync.register('sync-offline-activities');
      console.log('✅ Sync registrado: sync-offline-activities');
      return true;
      
    } catch (error) {
      console.error('❌ Error registrando sync:', error);
      return false;
    }
  }
  
  // Forzar sincronización manual
  async forceSync(): Promise<{ success: boolean; message: string }> {
    if (this.isBackgroundSyncSupported()) {
      const registered = await this.registerActivitySync();
      return {
        success: registered,
        message: registered ? 'Sincronización programada' : 'Error programando sync'
      };
    } else {
      return await this.manualSync();
    }
  }
  
  // Sincronización manual como fallback
  private async manualSync(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Iniciando sincronización manual...');
      
      const dbService = await import('./db');
      const activities = await dbService.dbService.getUnsyncedActivities();
      
      if (activities.length === 0) {
        return { success: true, message: 'No hay actividades pendientes de sincronización' };
      }
      
      const results = await Promise.allSettled(
        activities.map(activity => this.sendActivityToServer(activity))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return {
        success: failed === 0,
        message: `Sincronizadas: ${successful}, Fallidas: ${failed}`
      };
      
    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
      return { success: false, message: 'Error en sincronización' };
    }
  }
  
  // Enviar actividad al servidor
  private async sendActivityToServer(activity: any): Promise<void> {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'activity-sync',
          data: activity,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Marcar como sincronizada
      const dbService = await import('./db');
      if (activity.id) {
        await dbService.dbService.markActivityAsSynced(activity.id);
      }
    } catch (error) {
      console.error('❌ Error enviando actividad:', error);
      throw error;
    }
  }
  
  // Escuchar mensajes del Service Worker
  setupSyncListeners(callback: (message: any) => void) {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        console.log('📬 Mensaje de sync recibido:', event.data);
        callback(event.data);
      }
    });
  }
  
  // Verificar estado de sincronización
  async checkSyncStatus(): Promise<{ pending: number; total: number }> {
    try {
      const dbService = await import('./db');
      const unsynced = await dbService.dbService.getUnsyncedActivities();
      const total = await dbService.dbService.getActivitiesCount();
      
      return { 
        pending: unsynced.length, 
        total: total 
      };
    } catch (error) {
      console.error('Error verificando estado de sync:', error);
      return { pending: 0, total: 0 };
    }
  }
}

export const syncUtils = new SyncUtils();