import * as SecureStore from "expo-secure-store";

const GPS_ENABLED_KEY = "siscentro_gps_enabled";

/**
 * Obtiene la preferencia de uso del GPS.
 *
 * Si nunca se ha guardado ninguna preferencia,
 * se activa el GPS por defecto.
 */
export async function getGpsEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(
    GPS_ENABLED_KEY
  );

  if (value === null) {
    return true;
  }

  return value === "true";
}

/**
 * Guarda la preferencia de uso del GPS.
 */
export async function setGpsEnabled(
  enabled: boolean
): Promise<void> {
  await SecureStore.setItemAsync(
    GPS_ENABLED_KEY,
    String(enabled)
  );
}
