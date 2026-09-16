import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getMe } from "../src/api/auth";
import { getToken, removeToken } from "../src/storage/auth";
import { colors } from "../src/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const token = await getToken();

        if (!token) {
          return;
        }

        await getMe(token);
        setAuthenticated(true);
      } catch {
        await removeToken();
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  return authenticated ? (
    <Redirect href="/home" />
  ) : (
    <Redirect href="/login" />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
});