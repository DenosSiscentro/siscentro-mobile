import * as SecureStore from "expo-secure-store";
import { Usuario } from "../types/auth";

const TOKEN_KEY = "siscentro_access_token";
const USER_KEY = "siscentro_user";

const BIOMETRIC_KEY = "siscentro_biometric_enabled";
const BIOMETRIC_TOKEN_KEY = "siscentro_biometric_token";
const BIOMETRIC_USER_KEY = "siscentro_biometric_user";

const BIOMETRIC_PROMPT_KEY =
  "siscentro_biometric_prompt_shown";

// Sesión actual en memoria.
let sessionToken: string | null = null;
let sessionUser: Usuario | null = null;


/* ============================================================
   SESIÓN NORMAL
   ============================================================ */

/**
 * Guarda el token de sesión.
 */
export async function saveToken(token: string) {
  sessionToken = token;

  await SecureStore.setItemAsync(
    TOKEN_KEY,
    token
  );
}

/**
 * Obtiene el token de sesión.
 *
 * Primero intenta utilizar la sesión en memoria.
 * Si no existe, la recupera de SecureStore.
 */
export async function getToken(): Promise<string | null> {
  if (sessionToken) {
    return sessionToken;
  }

  const token = await SecureStore.getItemAsync(
    TOKEN_KEY
  );

  if (token) {
    sessionToken = token;
  }

  return token;
}

/**
 * Guarda el usuario de la sesión.
 */
export async function saveUser(user: Usuario) {
  sessionUser = user;

  await SecureStore.setItemAsync(
    USER_KEY,
    JSON.stringify(user)
  );
}

/**
 * Obtiene el usuario de la sesión.
 */
export async function getUser(): Promise<Usuario | null> {
  if (sessionUser) {
    return sessionUser;
  }

  const data = await SecureStore.getItemAsync(
    USER_KEY
  );

  if (!data) {
    return null;
  }

  try {
    const user = JSON.parse(data) as Usuario;

    sessionUser = user;

    return user;
  } catch {
    await SecureStore.deleteItemAsync(
      USER_KEY
    );

    return null;
  }
}

/**
 * Establece la sesión actual en memoria.
 */
export function setSession(
  token: string,
  user: Usuario
) {
  sessionToken = token;
  sessionUser = user;
}

/**
 * Elimina la sesión normal.
 */
export async function removeToken() {
  sessionToken = null;
  sessionUser = null;

  await SecureStore.deleteItemAsync(
    TOKEN_KEY
  );

  await SecureStore.deleteItemAsync(
    USER_KEY
  );
}


/**
 * Cierra la sesión normal.
 *
 * IMPORTANTE: esto NO debe tocar la configuración biométrica.
 * Si el usuario tiene la huella/Face ID activada, debe poder
 * seguir usándola para volver a entrar después de cerrar sesión;
 * la biometría solo se desactiva si el usuario lo hace explícitamente
 * (por ejemplo desde la pantalla de perfil, llamando a
 * clearBiometricSession()).
 */
export async function logout() {
  await removeToken();
}


/* ============================================================
   BIOMETRÍA
   ============================================================ */

/**
 * Obtiene el token almacenado para acceso biométrico.
 */
export async function getBiometricToken(): Promise<string | null> {
  return SecureStore.getItemAsync(
    BIOMETRIC_TOKEN_KEY
  );
}

/**
 * Obtiene el usuario almacenado para acceso biométrico.
 */
export async function getBiometricUser(): Promise<Usuario | null> {
  const data = await SecureStore.getItemAsync(
    BIOMETRIC_USER_KEY
  );

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as Usuario;
  } catch {
    await SecureStore.deleteItemAsync(
      BIOMETRIC_USER_KEY
    );

    return null;
  }
}

/**
 * Guarda las credenciales para acceso biométrico.
 */
export async function saveBiometricSession(
  token: string,
  user: Usuario
) {
  await SecureStore.setItemAsync(
    BIOMETRIC_TOKEN_KEY,
    token
  );

  await SecureStore.setItemAsync(
    BIOMETRIC_USER_KEY,
    JSON.stringify(user)
  );

  await setBiometricEnabled(true);
}

/**
 * Elimina completamente la configuración biométrica.
 *
 * Se llama cuando el usuario la desactiva explícitamente
 * desde el perfil (o si un token biométrico deja de ser válido
 * y se quiere forzar a reconfigurarla).
 */
export async function clearBiometricSession() {
  await SecureStore.deleteItemAsync(
    BIOMETRIC_TOKEN_KEY
  );

  await SecureStore.deleteItemAsync(
    BIOMETRIC_USER_KEY
  );

  await setBiometricEnabled(false);
}

/**
 * Activa o desactiva la biometría.
 */
export async function setBiometricEnabled(
  enabled: boolean
) {
  await SecureStore.setItemAsync(
    BIOMETRIC_KEY,
    enabled ? "true" : "false"
  );
}

/**
 * Indica si la biometría está activada.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(
    BIOMETRIC_KEY
  );

  return value === "true";
}


/* ============================================================
   AVISO DE BIOMETRÍA
   ============================================================ */

/**
 * Marca que ya se ha mostrado la pregunta de biometría.
 *
 * Esto evita que SIScentro vuelva a preguntar automáticamente
 * después de que el usuario haya elegido "Ahora no".
 */
export async function marcarBiometriaPreguntada() {
  await SecureStore.setItemAsync(
    BIOMETRIC_PROMPT_KEY,
    "true"
  );
}

/**
 * Indica si ya se ha preguntado por la biometría.
 */
export async function haSidoPreguntadaBiometria(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(
    BIOMETRIC_PROMPT_KEY
  );

  return value === "true";
}