import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { getToken, removeToken } from "../src/storage/auth";
import { getMe } from "../src/api/auth";

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
    return null;
  }

  return authenticated ? (
    <Redirect href="/home" />
  ) : (
    <Redirect href="/login" />
  );
}
