import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function obtenerTokenFCM(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("FCM: se necesita un dispositivo físico");
    return null;
  }

  if (Platform.OS !== "android") {
    console.warn("FCM: esta implementación está preparada para Android");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("FCM: permiso de notificaciones no concedido");
    return null;
  }

  const deviceToken = await Notifications.getDevicePushTokenAsync();

  console.log("======================================");
  console.log("FCM TOKEN");
  console.log(deviceToken.data);
  console.log("======================================");

  return String(deviceToken.data);
}