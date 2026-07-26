/**
 * Notificaciones de pedidos nuevos.
 *
 * El servidor (plugin nakama-production-panel >= 1.4.0) guarda el token Expo de
 * cada dispositivo y le manda un aviso cuando un pedido pagado entra a
 * producción. Requiere un development/production build: Expo Go ya no recibe
 * notificaciones remotas.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { registerPushToken, unregisterPushToken } from './api';
import { PUSH_CHANNEL_ID } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushState =
  | { status: 'enabled'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; message: string };

function projectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined;
  return fromConfig?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Pide permiso, crea el canal de Android y registra el token en el servidor.
 * Es idempotente: se puede llamar en cada arranque.
 */
export async function enablePush(): Promise<PushState> {
  if (!Device.isDevice) {
    return { status: 'unsupported', reason: 'Las notificaciones no funcionan en un emulador.' };
  }

  const id = projectId();
  if (!id) {
    return {
      status: 'unsupported',
      reason: 'Falta configurar el proyecto de EAS para las notificaciones.',
    };
  }

  try {
    if (Platform.OS === 'android') {
      // El canal debe existir antes del primer aviso o Android lo silencia.
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        name: 'Pedidos de producción',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E3000F',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return { status: 'denied' };

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await registerPushToken(token);
    return { status: 'enabled', token };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo activar las notificaciones.',
    };
  }
}

/** Da de baja este dispositivo. No lanza: al cerrar sesión no debe estorbar. */
export async function disablePush(): Promise<void> {
  try {
    const id = projectId();
    if (!id || !Device.isDevice) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await unregisterPushToken(token);
  } catch {
    /* el servidor limpia solo los tokens que dejan de existir */
  }
}
