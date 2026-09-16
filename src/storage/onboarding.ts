import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "siscentro_onboarding_completed";

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return value === "true";
}

export async function completeOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
}

export async function resetOnboarding(): Promise<void> {
  await SecureStore.deleteItemAsync(ONBOARDING_KEY);
}