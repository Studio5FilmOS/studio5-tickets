const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Convierte la clave pública VAPID base64 al formato Uint8Array
 * que requiere el navegador para suscribirse.
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
};

/**
 * Solicita permiso al usuario, suscribe al SW y guarda la suscripción en el backend.
 * @param {string} token - JWT del usuario autenticado
 * @returns {boolean} true si se activó, false si se denegó o ya estaba activo
 */
export const subscribeToPush = async (token) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications no soportadas en este navegador.');
    return false;
  }

  // Pedir clave pública VAPID al backend
  const vapidRes = await fetch(`${API_BASE}/api/push/vapid-public-key`);
  const { publicKey } = await vapidRes.json();

  // Registrar/obtener el Service Worker
  const registration = await navigator.serviceWorker.ready;

  // Verificar si ya existe una suscripción activa
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Solicitar permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso de notificaciones denegado.');
      return false;
    }

    // Crear nueva suscripción
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  // Guardar suscripción en el backend
  const saveRes = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subscription })
  });

  const result = await saveRes.json();
  return result.status === 'OK';
};

/**
 * Desactiva las notificaciones push para este navegador.
 * @param {string} token - JWT del usuario autenticado
 */
export const unsubscribeFromPush = async (token) => {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ endpoint })
    });
  }
};

/**
 * Comprueba si las notificaciones push están actualmente activas en este navegador.
 */
export const isPushSubscribed = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};
