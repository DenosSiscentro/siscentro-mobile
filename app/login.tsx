import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { login } from "../src/api/auth";
import { saveToken, saveUser } from "../src/storage/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Introduce tu email y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await login(email.trim(), password);
      if (rememberSession) {
        await saveToken(result.access_token);
        await saveUser(result.user);
}

      router.replace("/home");
    } catch (err: any) {
      console.error(err);

      if (err.message?.includes("401")) {
        setError("Email o contraseña incorrectos");
      } else {
        setError("No se ha podido conectar con Siscentro");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.backgroundCircle} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>S</Text>
          </View>

          <Text style={styles.logo}>SIScentro</Text>
          <Text style={styles.subtitle}>Control horario sencillo</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.welcome}>Bienvenido</Text>
          <Text style={styles.description}>
            Inicia sesión para registrar tu jornada.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>

            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="#A0A5AD"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.passwordContainer}>
  <TextInput
    style={styles.passwordInput}
    placeholder="Tu contraseña"
    placeholderTextColor="#A0A5AD"
    value={password}
    onChangeText={setPassword}
    secureTextEntry={!showPassword}
    autoCapitalize="none"
    autoCorrect={false}
  />

  <Pressable
    style={styles.eyeButton}
    onPress={() => setShowPassword((value) => !value)}
  >
    <Ionicons
  name={showPassword ? "eye-off-outline" : "eye-outline"}
  size={22}
  color="#6B7280"
/>
  </Pressable>
</View>

          <Pressable
  style={styles.rememberRow}
  onPress={() => setRememberSession((value) => !value)}
>
  <View
    style={[
      styles.checkbox,
      rememberSession && styles.checkboxChecked,
    ]}
  >
    {rememberSession ? (
      <Text style={styles.checkmark}>✓</Text>
    ) : null}
  </View>

  <Text style={styles.rememberText}>
    Mantener la sesión abierta
  </Text>
</Pressable>


          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>ENTRAR</Text>
                <Text style={styles.arrow}>→</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>SIScentro · Control horario</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },

  backgroundCircle: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#E8ECF3",
    top: -130,
    right: -100,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 42,
  },

  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  logoIconText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },

  subtitle: {
    color: "#737983",
    fontSize: 14,
    marginTop: 5,
  },

  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },

  welcome: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  description: {
    fontSize: 14,
    color: "#737983",
    marginTop: 6,
    marginBottom: 26,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#737983",
    letterSpacing: 1,
    marginBottom: 8,
  },

  input: {
    height: 54,
    backgroundColor: "#F5F6F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },

  error: {
    color: "#DC2626",
    textAlign: "center",
    fontSize: 13,
  },

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 22,
    marginLeft: 12,
  },

  footer: {
    textAlign: "center",
    color: "#A0A5AD",
    fontSize: 12,
    marginTop: 28,
  },
  rememberRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: -2,
  marginBottom: 18,
},

checkbox: {
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 1.5,
  borderColor: "#C7CBD2",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
},

checkboxChecked: {
  backgroundColor: "#111827",
  borderColor: "#111827",
},

checkmark: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "800",
},

rememberText: {
  color: "#4B5563",
  fontSize: 14,
},
passwordContainer: {
  height: 54,
  backgroundColor: "#F5F6F8",
  borderRadius: 12,
  flexDirection: "row",
  alignItems: "center",
},

passwordInput: {
  flex: 1,
  height: 54,
  paddingHorizontal: 16,
  fontSize: 16,
  color: "#111827",
},

eyeButton: {
  height: 54,
  paddingHorizontal: 14,
  alignItems: "center",
  justifyContent: "center",
},

eye: {
  fontSize: 20,
},
});