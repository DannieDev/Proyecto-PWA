# 🚀 Why?

Una **Progressive Web App (PWA)** moderna para gestión de actividades educativas, desarrollada como proyecto universitario que implementa todas las características esenciales de PWAs con tecnologías de vanguardia.

![PWA](https://img.shields.io/badge/PWA-optimized-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff)
![IndexedDB](https://img.shields.io/badge/IndexedDB-supported-yellow)


## ✨ Características Implementadas

### 🎯 **Componentes PWA Esenciales (Semana 3)**
- ✅ **Web App Manifest** - Configuración completa de instalación  
- ✅ **App Shell Architecture** - Interfaz de carga instantánea  
- ✅ **Service Worker Básico** - Cache estratégico inicial  

### 🔥 **Funcionalidades Avanzadas (Semana 4)**
- ✅ **Formularios Offline** con IndexedDB  
- ✅ **Sincronización en Segundo Plano** (Background Sync API)  
- ✅ **Estrategias de Cache Avanzadas** (Cache First, Network First, Stale-While-Revalidate)  
- ✅ **Notificaciones Push** con VAPID  
- ✅ **Página Offline Personalizada**

---

## 🛠️ **Stack Tecnológico**

- **Frontend:** React 18 + TypeScript + Vite  
- **Build Tool:** Vite 5.0  
- **PWA Features:** Service Workers, Cache API, IndexedDB  
- **Notifications:** Push API + VAPID  
- **Code Quality:** ESLint + Prettier + Husky  
- **Deployment:** GitHub Pages / Vercel / Netlify  

---

## 🚀 Comenzar

### Prerrequisitos
- Node.js 18+  
- npm o yarn  
- Git  

### Instalación y Desarrollo

```bash
# Clonar el proyecto
git clone https://github.com/DannieDev/Proyecto-PWA.git
cd Why

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build

# Preview build de producción
npm run preview
```

---

## ⚙️ Configuración de Calidad de Código

```bash
# Instalar linters y formatters
npm install eslint prettier eslint-config-prettier eslint-plugin-react-hooks --save-dev

# Configurar Git hooks
npm install husky lint-staged @commitlint/{config-conventional,cli} --save-dev
npx husky install
```

---

## 📱 Funcionalidades Detalladas

### 1. 🏗️ App Shell Architecture
- Carga instantánea de la interfaz base  
- Navegación fluida entre secciones  
- Estructura modular y componentizada  

### 2. 💾 Almacenamiento Offline con IndexedDB

```typescript
interface Activity {
  id?: number;
  title: string;
  description: string;
  category: string;
  timestamp: Date;
  synced: boolean;
}
```

**Características:**
- ✅ Crear reportes sin conexión  
- ✅ Listar actividades almacenadas localmente  
- ✅ Sincronización automática al recuperar conexión  

### 3. 🔄 Sincronización en Segundo Plano

```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-activities') {
    event.waitUntil(syncOfflineActivities());
  }
});
```

**Flujo de sincronización:**
1. Usuario guarda actividad offline  
2. Service Worker registra sync pendiente  
3. Al recuperar conexión, se envían datos automáticamente  
4. Se eliminan registros sincronizados de IndexedDB  

### 4. 🗂️ Estrategias de Cache Avanzadas

| Recurso | Estrategia | Propósito |
|----------|-------------|------------|
| App Shell | Cache First | Máxima velocidad de carga |
| Recursos Estáticos | Cache First | Archivos CSS/JS inmutables |
| Imágenes | Stale-While-Revalidate | Balance entre velocidad y actualización |
| Datos API | Network First | Datos siempre frescos |
| Navegación | Network First + Offline | Experiencia robusta |

### 5. 🔔 Notificaciones Push

```typescript
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
});
```

**Implementación completa:**
- ✅ Solicitud de permisos al usuario  
- ✅ Generación de suscriptor con VAPID  
- ✅ Recepción de notificaciones con app cerrada  
- ✅ Manejo de clics en notificaciones  

---

## 🏗️ Arquitectura del Proyecto

```
src/
├── components/
│   ├── ActivityForm.tsx
│   └── ActivitiesList.tsx
├── App.tsx
├── App.css
├── styles/
│   └── OfflineForm.css
└── utils/
    └── db.ts

public/
├── sw.js
├── offline.html
├── manifest.json
└── icons/
```

---

## ⚙️ Configuración Técnica

### Service Worker (`sw.js`)
```javascript
const CACHE_NAMES = {
  static: 'why-app-static-v1',
  dynamic: 'why-app-dynamic-v1',
  shell: 'why-app-shell-v1'
};
```

### Web App Manifest
```json
{
  "name": "Why? - App Educativa",
  "short_name": "Why?",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": []
}
```

---


