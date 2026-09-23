import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { post } from './api';

/**
 * Push registration.
 *
 * Expo Go removed Android remote-push support in SDK 53, and importing
 * expo-notifications there throws at module scope — which would crash the app
 * on launch. So the module is loaded dynamically, only where it actually
 * works, and everything degrades to a no-op elsewhere.
 *
 * Push therefore works in a development build or a store build, and is simply
 * inactive in Expo Go. Nothing else in the app depends on it.
 */

const isExpoGo = Constants.executionEnvironment === 'storeClient';

/** True when this runtime can actually receive remote notifications. */
export function pushSupported() {
  return !(isExpoGo && Platform.OS === 'android');
}

export async function registerPush(): Promise<string | null> {
  if (!pushSupported()) {
    console.log('[push] skipped: Expo Go on Android cannot receive remote notifications');
    return null;
  }

  try {
    const Device = await import('expo-device');
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (!Device.isDevice) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let granted = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      granted = status;
    }
    if (granted !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('offers', {
        name: 'Offers and orders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e11d48',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) await post('/push/register', { expo_token: token, platform: Platform.OS });
    return token;
  } catch (error: any) {
    // Never let a notification problem take the app down.
    console.log('[push] unavailable:', error?.message ?? error);
    return null;
  }
}
