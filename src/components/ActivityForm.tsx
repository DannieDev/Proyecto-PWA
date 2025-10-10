import React, { useState, useEffect } from 'react';
import { dbService } from '../utils/db';
import type { ActivityFormData } from '../types/offline';

export const ActivityForm: React.FC = () => {
  const [formData, setFormData] = useState<ActivityFormData>({
    studentName: '',
    activity: '',
    date: new Date().toISOString().split('T')[0],
    hours: 1
  });
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hours' ? parseInt(value) || 1 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await dbService.addActivity(formData);

      if (isOnline) {
        alert('Reporte guardado correctamente (tienes conexión)');
      } else {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-offline-activities');
            alert('Reporte guardado en modo offline. Se sincronizará automáticamente cuando recuperes la conexión.');
          } catch (syncError) {
            console.error('Error registrando sync:', syncError);
            alert('Reporte guardado en modo offline. Sincroniza manualmente más tarde.');
          }
        } else {
          alert('Reporte guardado en modo offline. Tu navegador no soporta sincronización automática.');
        }
      }

      setFormData({
        studentName: '',
        activity: '',
        date: new Date().toISOString().split('T')[0],
        hours: 1
      });

    } catch (error) {
      console.error('Error al guardar actividad:', error);
      alert('Error al guardar el reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="activity-form-container">
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        <div className="status-indicator"></div>
        <span>
          {isOnline ? 'Tienes conexión a internet' : 'Sin conexión - Modo offline activado'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="activity-form">
        <h2>Reporte de Actividades del Alumno</h2>
        
        <div className="form-group">
          <label htmlFor="studentName">Nombre del Alumno:</label>
          <input
            type="text"
            id="studentName"
            name="studentName"
            value={formData.studentName}
            onChange={handleInputChange}
            required
            placeholder="Ingresa el nombre completo"
          />
        </div>

        <div className="form-group">
          <label htmlFor="activity">Actividad Realizada:</label>
          <textarea
            id="activity"
            name="activity"
            value={formData.activity}
            onChange={handleInputChange}
            required
            rows={3}
            placeholder="Describe la actividad realizada..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Fecha:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hours">Horas Dedicadas:</label>
            <select
              id="hours"
              name="hours"
              value={formData.hours}
              onChange={handleInputChange}
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(hour => (
                <option key={hour} value={hour}>
                  {hour} hora{hour > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`submit-btn ${!isOnline ? 'offline' : ''}`}
        >
          {isSubmitting ? 'Guardando...' : 
           isOnline ? 'Guardar Reporte' : 'Guardar en Offline'}
        </button>

        {!isOnline && (
          <div className="offline-notice">
            <p><strong>Modo Offline Activado</strong></p>
            <p>Tu reporte se guardará localmente en IndexedDB y se sincronizará automáticamente cuando recuperes la conexión.</p>
          </div>
        )}
      </form>
    </div>
  );
};