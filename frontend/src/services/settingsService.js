import api from './api';

let cachedSettings = null;

export const getPublicSettings = async () => {
  if (cachedSettings) return cachedSettings;
  try {
    const res = await api.get('/admin/settings/public');
    if (res.data?.status === 'OK') {
      cachedSettings = res.data.settings;
      return cachedSettings;
    }
  } catch (err) {
    console.warn('Usando configuración por defecto de soporte');
  }
  return {
    contact_whatsapp: '593963162788',
    cartelera_contact_message: 'Hola, deseo contratar el módulo de Cartelera de Eventos en mi cuenta.',
    logistics_contact_message: 'Hola, deseo contratar el módulo de Logística en mi cuenta.'
  };
};

export const clearSettingsCache = () => {
  cachedSettings = null;
};
