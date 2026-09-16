import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light
) {
  const colorScheme = useColorScheme();

  // React Native puede devolver "unspecified".
  // Para nuestra aplicación lo tratamos como "light".
  const theme: "light" | "dark" =
    colorScheme === "dark" ? "dark" : "light";

  const colorFromProps =
    theme === "dark" ? props.dark : props.light;

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}