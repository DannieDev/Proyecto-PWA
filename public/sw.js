const CACHE_NAMES = {
  static: 'why-app-static-v1',
  dynamic: 'why-app-dynamic-v1',
  shell: 'why-app-shell-v1'
};

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const API_ROUTES = [
  '/api/',
  'https://jsonplaceholder.typicode.com/'
];

const performanceMetrics = {
  cacheHits: 0,
  networkHits: 0,
  errors: 0
};

performanceMetrics.cacheHits++;

self.addEventListener('message', (event) => {
  if (event.data.type === 'GET_METRICS') {
    event.ports[0].postMessage(performanceMetrics);
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.shell)
      .then((cache) => {
        return Promise.all(
          APP_SHELL_ASSETS.map(asset => {
            return cache.add(asset).catch(error => {
              console.log(`No se pudo cachear ${asset}:`, error);
            });
          })
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Error durante instalación:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      clearOldCaches(),
      checkAndSyncOnActivation(),
      verifyCacheIntegrity()
    ])
  );
});


async function clearOldCaches() {
  const cacheKeys = await caches.keys();
  const oldCaches = cacheKeys.filter(key =>
    key.startsWith('why-app-') && !Object.values(CACHE_NAMES).includes(key)
  );

  return Promise.all(
    oldCaches.map(cacheName => caches.delete(cacheName))
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isAppShellRequest(request)) {
    event.respondWith(handleAppShellRequest(request));
    return;
  }

  if (isStaticAssetRequest(request)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
});

function isAppShellRequest(request) {
  const url = new URL(request.url);
  return APP_SHELL_ASSETS.some(asset =>
    url.pathname === asset || url.pathname.startsWith(asset)
  );
}

function isStaticAssetRequest(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname.startsWith(asset));
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return API_ROUTES.some(route => url.href.includes(route));
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return request.destination === 'image' ||
    /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(url.pathname);
}

async function handleAppShellRequest(request) {
  try {
    if (request.method !== 'GET') {
      return await fetch(request);
    }

    const cache = await caches.open(CACHE_NAMES.shell);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Error en cache, sirviendo desde network:', error);
    return fetch(request);
  }
}

async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('No se pudo actualizar cache en background:', request.url);
  }
}

function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}

async function handleStaticAssetRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.static);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Error en recursos estáticos:', error);
    return fetch(request);
  }
}

async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.dynamic);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Sin conexión, buscando en cache API:', request.url);


    const cache = await caches.open(CACHE_NAMES.dynamic);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('API servida desde cache (offline):', request.url);
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'No hay conexión y no hay datos en cache',
        timestamp: new Date().toISOString(),
        suggestion: 'Revisa tu conexión o intenta más tarde'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function verifyCacheIntegrity() {
  try {
    const cache = await caches.open(CACHE_NAMES.shell);
    const offlinePage = await cache.match('/offline.html');

    if (!offlinePage) {
      await cache.add('/offline.html');
    }

  } catch (error) {
    console.error('❌ Error verificando cache:', error);
  }
}

async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    this.revalidateInBackground(request, cache);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 500000) {
        await cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    return this.getImagePlaceholder();
  }
}

const FALLBACKS = {
  '/api/activities': () => new Response(JSON.stringify([]), {
    headers: { 'Content-Type': 'application/json' }
  }),
  'image': () => this.getImagePlaceholder(),
  'default': () => new Response('Resource not available offline', { status: 503 })
};

async function getIntelligentFallback(request) {
  const url = new URL(request.url);

  if (isApiRequest(request)) {
    return FALLBACKS['/api/activities']();
  }

  if (isImageRequest(request)) {
    return FALLBACKS['image']();
  }

  if (request.mode === 'navigate') {
    return await getOfflinePage();
  }

  return FALLBACKS['default']();
}

async function revalidateInBackground(request, cache) {
  if (!navigator.onLine) return;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
      console.log('🔄 Revalidado en background:', request.url);
    }
  } catch (error) {
  }
}

async function handleNavigationRequest(request) {
  const url = new URL(request.url);

  // Si es una ruta de nuestra app SPA
  if (url.origin === self.location.origin) {
    try {
      // Para rutas que no sean la raíz, verificar si existen
      if (url.pathname !== '/' && !url.pathname.startsWith('/static/')) {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok && networkResponse.status === 200) {
            return networkResponse;
          }
        } catch (error) {
          // Si falla, mostrar página offline
          console.log('📴 Ruta no accesible offline:', url.pathname);
          return await getOfflinePage();
        }
      }

      // Para la ruta principal, servir desde cache
      const cache = await caches.open(CACHE_NAMES.shell);
      const cachedResponse = await cache.match('/') || await cache.match('/index.html');

      if (cachedResponse) {
        return cachedResponse;
      }

      // Último recurso: intentar network
      return await fetch(request);

    } catch (error) {
      console.log('📴 Navegación offline:', url.pathname);
      return await getOfflinePage();
    }
  }
  return fetch(request);
}

async function getOfflinePage() {
  try {
    const cache = await caches.open(CACHE_NAMES.shell);
    const offlinePage = await cache.match('/offline.html');

    if (offlinePage) {
      return offlinePage;
    }

    return new Response(
      '<h1>Sin Conexión</h1><p>La aplicación no está disponible offline en esta ruta.</p>',
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  } catch (error) {
    console.error('Error obteniendo página offline:', error);
    return new Response('Offline', { status: 503 });
  }
}

if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {

    if (event.tag === 'sync-offline-activities') {
      event.waitUntil(syncOfflineActivities());
    }
  });
} else {
  console.log('Background Sync no disponible en este navegador');
}

async function isOnline() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
      method: 'HEAD',
      cache: 'no-store'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function checkAndSyncOnActivation() {
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (await isOnline()) {
      const activities = await getAllActivitiesFromIDB();

      if (activities.length > 0) {
        setTimeout(() => {
          syncOfflineActivities();
        }, 3000);
      } else {
        console.log('No hay actividades pendientes para sincronizar');
      }
    } else {
      console.log('Sin conexión, no se puede sincronizar');
    }
  } catch (error) {
    console.log('Error verificando actividades:', error);
  }
}


self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      checkAndSyncOnActivation()
    ])
  );
});

if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    console.log('Evento de Background Sync recibido:', event.tag);

    if (event.tag === 'sync-offline-activities') {
      event.waitUntil(syncOfflineActivities());
    }
  });
} else {
  console.log('Background Sync no disponible en este navegador');
}

async function syncOfflineActivities() {
  try {

    if (!await isOnline()) {
      console.log('Sin conexión, abortando sincronización');
      return;
    }

    const activities = await getAllActivitiesFromIDB();
    console.log(`${activities.length} actividades encontradas para sincronizar`);

    if (activities.length === 0) {
      await notifyAppAboutSync([]);
      return;
    }

    const activityIds = activities.map(a => a.id).filter(Boolean);
    await notifyAppAboutSyncStart(activityIds);

    const results = await Promise.allSettled(
      activities.map(activity => sendActivityToServer(activity))
    );

    const successfulSyncs = results.filter(result => result.status === 'fulfilled').length;
    const failedSyncs = results.filter(result => result.status === 'rejected').length;

    await notifyAppAboutSync(results);

  } catch (error) {
    console.error('Error en la sincronización:', error);
    await notifyAppAboutSync([]);
  }
}

async function getAllActivitiesFromIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WhyAppDB', 2);

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db) {
        console.log('Base de datos no disponible');
        resolve([]);
        return;
      }

      if (!db.objectStoreNames.contains('activities')) {
        console.log('Object store "activities" no encontrado, retornando array vacío');
        resolve([]);
        return;
      }

      try {
        const transaction = db.transaction(['activities'], 'readonly');
        const store = transaction.objectStore('activities');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result || []);
        };

        getAllRequest.onerror = (error) => {
          console.error('Error en getAll:', error);
          resolve([]);
        };
      } catch (transactionError) {
        console.error('Error en transacción:', transactionError);
        resolve([]);
      }
    };

    request.onerror = (error) => {
      console.error('Error abriendo BD:', error);
      resolve([]);
    };

    request.onblocked = () => {
      console.log('Base de datos bloqueada');
      resolve([]);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('activities')) {
        const store = db.createObjectStore('activities', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('by-date', 'date');
      }
    };
  });
}

async function sendActivityToServer(activity) {
  try {
    console.log('Enviando actividad:', activity.id);

    if (!activity.id) {
      return { success: false, error: 'Sin ID' };
    }

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

    await response.json();

    await deleteActivityFromIDB(activity.id);

    return { success: true, activityId: activity.id };

  } catch (error) {
    console.error('Error sincronizando actividad:', activity.id, error);
    throw error;
  }
}

async function deleteActivityFromIDB(activityId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WhyAppDB', 2);

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db) {
        console.log('Base de datos no disponible para eliminar');
        resolve();
        return;
      }

      if (!db.objectStoreNames.contains('activities')) {
        console.log('Object store "activities" no encontrado, no se puede eliminar');
        resolve();
        return;
      }

      try {
        const transaction = db.transaction(['activities'], 'readwrite');
        const store = transaction.objectStore('activities');
        const deleteRequest = store.delete(activityId);

        deleteRequest.onsuccess = () => {
          console.log('Actividad ELIMINADA de IndexedDB:', activityId);
          resolve();
        };

        deleteRequest.onerror = (error) => {
          console.error('Error eliminando actividad:', error);
          resolve();
        };
      } catch (transactionError) {
        console.error('Error en transacción de eliminación:', transactionError);
        resolve();
      }
    };

    request.onerror = (error) => {
      console.error('Error abriendo BD para eliminar:', error);
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('activities')) {
        const store = db.createObjectStore('activities', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('by-date', 'date');
      }
    };
  });
}

async function notifyAppAboutSyncStart(activityIds) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_STARTED',
        activityIds: activityIds,
        timestamp: new Date().toISOString()
      });
    });
    console.log(`Notificación de inicio enviada para ${activityIds.length} actividades`);
  } catch (error) {
    console.error('Error notificando inicio de sync:', error);
  }
}

async function notifyAppAboutSync(results) {
  try {
    const clients = await self.clients.matchAll();
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        payload: {
          successful,
          failed,
          total: results.length,
          timestamp: new Date().toISOString(),
          message: successful > 0 ?
            `${successful} actividades sincronizadas y eliminadas` :
            'Error en sincronización'
        }
      });
    });

    console.log(`Notificación enviada: ${successful} exitosas, ${failed} fallidas`);
  } catch (error) {
    console.error('Error notificando a la app:', error);
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_SYNC') {
    event.waitUntil(syncOfflineActivities());
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/static/') ||
    event.request.url.includes('/icons/') ||
    event.request.url.includes('/manifest.json')) {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});

self.addEventListener('online', () => {
  console.log('Conexión recuperada, verificando sincronización...');
});

self.addEventListener('offline', () => {
  console.log('Conexión perdida');
});


self.addEventListener('push', function(event) {
  console.log('📬 Evento push recibido:', event);
  
  if (!event.data) {
    console.log('Push event sin data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Tienes una nueva notificación de Why?',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      image: data.image || null,
      data: data.data || { url: data.url || '/' },
      actions: [
        {
          action: 'open',
          title: 'Abrir App',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/icons/icon-192x192.png'
        }
      ],
      tag: data.tag || 'why-notification',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Why?',
        options
      )
    );
  } catch (error) {
    console.error('Error procesando notificación push:', error);
    
    const options = {
      body: 'Nueva actividad disponible en Why?',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png'
    };
    
    event.waitUntil(
      self.registration.showNotification('Why?', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notificación cerrada:', event.notification.tag);
});