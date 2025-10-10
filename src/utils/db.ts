import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface FormDB extends DBSchema {
  'activities': {
    key: number;
    value: {
      id?: number;
      studentName: string;
      activity: string;
      date: string;
      hours: number;
      createdAt: Date;
    };
    indexes: { 'by-date': string };
  };
}

class DatabaseService {
  private db: IDBPDatabase<FormDB> | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureDB(): Promise<IDBPDatabase<FormDB>> {
    if (this.db) {
      return this.db;
    }
    
    if (!this.initPromise) {
      this.initPromise = this.initDB();
    }
    
    await this.initPromise;
    return this.db!;
  }

    async getUnsyncedActivities(): Promise<FormDB['activities']['value'][]> {
    try {
      const db = await this.ensureDB();
      
      if (!db.objectStoreNames.contains('activities')) {
        console.warn('Object store "activities" no encontrado, retornando array vacío');
        return [];
      }

      const allActivities = await db.getAll('activities');
      return allActivities || [];
    } catch (error) {
      console.error('Error obteniendo actividades no sincronizadas:', error);
      return [];
    }
  }

  async markActivityAsSynced(id: number): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      if (!db.objectStoreNames.contains('activities')) {
        console.warn('Object store "activities" no encontrado');
        return;
      }

      console.log(`Actividad ${id} marcada como sincronizada`);
      
    } catch (error) {
      console.error('Error marcando actividad como sincronizada:', error);
      throw error;
    }
  }


  async initDB(): Promise<void> {
    try {
      this.db = await openDB<FormDB>('WhyAppDB', 2, {
        upgrade(db, oldVersion) {
          
          if (oldVersion < 1) {
            const store = db.createObjectStore('activities', {
              keyPath: 'id',
              autoIncrement: true
            });
            store.createIndex('by-date', 'date');
          }
          
          if (oldVersion === 1) {
            console.log('Manteniendo estructura existente de versión 1');
          }
        },
      });
    } catch (error) {
      console.error('Error inicializando la base de datos:', error);
      throw error;
    }
  }

  async addActivity(activity: Omit<FormDB['activities']['value'], 'id' | 'createdAt'>): Promise<number> {
    try {
      const db = await this.ensureDB();
      
      const activityWithMeta = {
        ...activity,
        createdAt: new Date()
      };
      
      const id = await db.add('activities', activityWithMeta);
      return id;
    } catch (error) {
      console.error('Error agregando actividad:', error);
      throw error;
    }
  }

  async getAllActivities(): Promise<FormDB['activities']['value'][]> {
    try {
      const db = await this.ensureDB();
      
      if (!db.objectStoreNames.contains('activities')) {
        console.warn('⚠️ Object store "activities" no encontrado, retornando array vacío');
        return [];
      }
      
      const activities = await db.getAll('activities');
      return activities || [];
    } catch (error) {
      console.error('Error obteniendo actividades:', error);
      return [];
    }
  }

  async deleteActivity(id: number): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      if (!db.objectStoreNames.contains('activities')) {
        console.warn('Object store "activities" no encontrado, no se puede eliminar');
        return;
      }
      
      await db.delete('activities', id);
    } catch (error) {
      console.error('Error eliminando actividad:', error);
      throw error;
    }
  }

  async getActivitiesCount(): Promise<number> {
    try {
      const db = await this.ensureDB();
      
      if (!db.objectStoreNames.contains('activities')) {
        return 0;
      }
      
      return await db.count('activities');
    } catch (error) {
      console.error('Error contando actividades:', error);
      return 0;
    }
  }
}

export const dbService = new DatabaseService();