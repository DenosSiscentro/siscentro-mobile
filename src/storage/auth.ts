import * as SecureStore from "expo-secure-store";
import { Usuario } from "../types/auth";

const TOKEN_KEY = "siscentro_access_token";
const USER_KEY = "siscentro_user";

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveUser(user: Usuario) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<Usuario | null> {
  const data = await SecureStore.getItemAsync(USER_KEY);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}