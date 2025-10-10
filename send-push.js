import webpush from 'web-push';

const vapidKeys = {
  publicKey: 'TU_CLAVE_PUBLICA_VAPID_AQUI',
  privateKey: 'TU_CLAVE_PRIVADA_VAPID_AQUI'
};

webpush.setVapidDetails(
  'mailto:test@whyapp.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const subscription = {
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "TU_KEY_P256DH_AQUI...",
    "auth": "TU_AUTH_KEY_AQUI..."
  }
};

const payload = JSON.stringify({
  title: 'Why? - Test desde Script',
  body: '¡Notificación enviada usando Node.js directamente!',
  icon: '/icons/icon-192x192.png',
  url: '/',
  actions: [
    { action: 'open', title: 'Abrir App' },
    { action: 'close', title: 'Cerrar' }
  ]
});

console.log('Enviando notificación push...');

webpush.sendNotification(subscription, payload)
  .then(response => {
    console.log('Notificación enviada exitosamente!');
    console.log('Status:', response.statusCode);
  })
  .catch(error => {
    console.error('Error enviando notificación:');
    console.error('Código:', error.statusCode);
    console.error('Cuerpo:', error.body);
  });