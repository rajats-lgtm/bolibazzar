import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { post } from './api';

Notifications.setNotificationHandler({
  // SDK 53+ replaced shouldShowAlert with separate banner and list controls.
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register this device for push. The server ties the token to whoever is
 * signed in, so this must be called after sign-in.
 */
export async function registerPush() {
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
}
