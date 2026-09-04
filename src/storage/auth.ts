import * as SecureStore from "expo-secure-store";
import { Usuario } from "../types/auth";

const TOKEN_KEY = "siscentro_access_token";
const USER_KEY = "siscentro_user";
const BIOMETRIC_KEY = "siscentro_biometric_enabled";
const BIOMETRIC_TOKEN_KEY = "siscentro_biometric_token";
const BIOMETRIC_USER_KEY = "siscentro_biometric_user";

// Sesión temporal: desaparece al cerrar completamente la aplicación.
let sessionToken: string | null = null;
let sessionUser: Usuario | null = null;

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  if (sessionToken) {
    return sessionToken;
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getBiometricToken() {
  return SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
}


export async function getBiometricUser(): Promise<Usuario | null> {
  const data = await SecureStore.getItemAsync(BIOMETRIC_USER_KEY);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

export async function saveBiometricSession(
  token: string,
  user: Usuario
) {
  await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
  await SecureStore.setItemAsync(
    BIOMETRIC_USER_KEY,
    JSON.stringify(user)
  );
}

export async function clearBiometricSession() {
  await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
  await SecureStore.setItemAsync(BIOMETRIC_KEY, "false");
}
export function setSession(token: string, user: Usuario) {
  sessionToken = token;
  sessionUser = user;
}

export async function saveUser(user: Usuario) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<Usuario | null> {
  if (sessionUser) {
    return sessionUser;
  }

  const data = await SecureStore.getItemAsync(USER_KEY);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

export async function removeToken() {
  sessionToken = null;
  sessionUser = null;

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function setBiometricEnabled(enabled: boolean) {
  await SecureStore.setItemAsync(
    BIOMETRIC_KEY,
    enabled ? "true" : "false"
  );
}

export async function isBiometricEnabled() {
  const value = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return value === "true";
}

export async function logout() {
  sessionToken = null;
  sessionUser = null;

  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);

  await clearBiometricSession();
}