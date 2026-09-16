import { Platform } from "react-native";

import { authenticatedFetch } from "./client";

export async function registrarDispositivoPush(
  token: string
) {
  try {
    if (!token) {
      return false;
    }

    const response = await authenticatedFetch(
      "/dispositivos-push",
      {
        method: "POST",
        body: JSON.stringify({
          token,
          plataforma: Platform.OS,
        }),
      }
    );

    if (!response.ok) {
      console.warn(
        "No se pudo registrar el dispositivo push:",
        response.status
      );

      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      "Error registrando el dispositivo push:",
      error
    );

    return false;
  }
}
