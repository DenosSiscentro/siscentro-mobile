import { router } from "expo-router";

import {
  getToken,
  removeToken,
} from "../storage/auth";

const API_URL =
  "https://ncontrol.siscentro.com/api/v1";

/**
 * Realiza una petición autenticada.
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();

  if (!token) {
    router.replace("/login");

    throw new Error("No hay sesión");
  }

  const headers = new Headers(
    options.headers
  );

  headers.set(
    "Authorization",
    `Bearer ${token}`
  );

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  /**
   * El token ya no es válido.
   *
   * Eliminamos la sesión normal pero conservamos
   * las credenciales biométricas.
   */
  if (response.status === 401) {
    await removeToken();

    router.replace("/login");

    throw new Error("Sesión caducada");
  }

  return response;
}