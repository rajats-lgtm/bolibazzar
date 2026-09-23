import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../lib/theme';

/**
 * Routing:
 *   /                  landing — redirects to the right home if already signed in
 *   /signin, /signup   pick buyer or supplier, then verify by code
 *   /buyer/*           buyer side
 *   /supplier/*        supplier side
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="signin" />
        <Stack.Screen name="signup" />
        {/* Entering a role replaces the stack, so back never returns to auth. */}
        <Stack.Screen name="buyer/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="supplier/index" options={{ gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
