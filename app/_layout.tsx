import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="home"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="historial"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="recordatorios"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="perfil"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="correcciones"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
  name="diagnostico-notificaciones"
  options={{
    headerShown: false,
  }}
/>
      </Stack>
    </SafeAreaProvider>
  );
}