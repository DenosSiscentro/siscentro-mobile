import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Feather,
  Ionicons,
} from "@expo/vector-icons";

import * as LocalAuthentication from "expo-local-authentication";

import { getMe, login } from "../src/api/auth";

import {
  getBiometricToken,
  getBiometricUser,
  haSidoPreguntadaBiometria,
  isBiometricEnabled,
  marcarBiometriaPreguntada,
  saveBiometricSession,
  saveToken,
  saveUser,
  setSession
} from "../src/storage/auth";

import { colors } from "../src/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rememberSession, setRememberSession] =
    useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [biometricAvailable, setBiometricAvailable] =
    useState(false);

  const [biometricEnabled, setBiometricEnabledState] =
    useState(false);

  const [checkingBiometric, setCheckingBiometric] =
    useState(true);


  /* ============================================================
     COMPROBAR BIOMETRÍA
     ============================================================ */

  useEffect(() => {
    async function comprobarBiometria() {
      try {
        const compatible =
          await LocalAuthentication.hasHardwareAsync();

        const enrolled =
          await LocalAuthentication.isEnrolledAsync();

        const enabled =
          await isBiometricEnabled();

        setBiometricAvailable(
          compatible && enrolled
        );

        setBiometricEnabledState(enabled);
      } catch (err) {
        console.error(
          "Error comprobando biometría:",
          err
        );
      } finally {
        setCheckingBiometric(false);
      }
    }

    comprobarBiometria();
  }, []);


  /* ============================================================
     LOGIN BIOMÉTRICO
     ============================================================ */

  async function handleBiometricLogin() {
    if (loading) {
      return;
    }

    try {
      setError("");
      setLoading(true);

      const enabled =
        await isBiometricEnabled();

      if (!enabled) {
        return;
      }

      const token =
        await getBiometricToken();

      const user =
        await getBiometricUser();

      if (!token || !user) {
        setError(
          "No hay una sesión biométrica guardada. Inicia sesión con tu contraseña."
        );

        return;
      }

      const result =
        await LocalAuthentication.authenticateAsync(
          {
            promptMessage:
              "Acceder a Siscentro",

            cancelLabel:
              "Cancelar",

            fallbackLabel:
              "Usar contraseña",
          }
        );

      if (!result.success) {
        return;
      }

      try {
        const validatedUser =
          await getMe(token);

        setSession(
          token,
          validatedUser
        );

        router.replace("/home");
      } catch (err) {
        console.error(
          "Token biométrico no válido:",
          err
        );

        // La biometría sigue activada.
        // Solo ha dejado de ser válido el token almacenado.
        // El siguiente login con contraseña lo renovará.
        setError(
          "La sesión biométrica necesita renovarse. Inicia sesión con tu contraseña."
        );
      }
    } catch (err) {
      console.error(
        "Error en autenticación biométrica:",
        err
      );

      setError(
        "No se ha podido utilizar la autenticación biométrica."
      );
    } finally {
      setLoading(false);
    }
  }


  /* ============================================================
     OFRECER BIOMETRÍA AUTOMÁTICAMENTE (auto-login al entrar)
     ============================================================ */

  useEffect(() => {
    if (
      checkingBiometric ||
      !biometricAvailable ||
      !biometricEnabled
    ) {
      return;
    }

    handleBiometricLogin();
  }, [
    checkingBiometric,
    biometricAvailable,
    biometricEnabled,
  ]);


  /* ============================================================
     PREGUNTAR SI QUIERE ACTIVAR LA HUELLA (tras 1er login normal)
     ============================================================ */

  function offerBiometricSetup(
    token: string,
    user: any
  ) {
    Alert.alert(
      "Acceso más rápido",
      "¿Quieres usar tu huella o Face ID para acceder a Siscentro la próxima vez?",
      [
        {
          text: "Ahora no",
          style: "cancel",
          onPress: async () => {
            await marcarBiometriaPreguntada();
            router.replace("/home");
          },
        },
        {
          text: "Activar",
          onPress: async () => {
            await marcarBiometriaPreguntada();
            await confirmarYActivarBiometria(
              token,
              user
            );
          },
        },
      ]
    );
  }

  async function confirmarYActivarBiometria(
    token: string,
    user: any
  ) {
    try {
      const result =
        await LocalAuthentication.authenticateAsync(
          {
            promptMessage:
              "Confirma tu huella para activarla",

            cancelLabel:
              "Cancelar",
          }
        );

      if (result.success) {
        await saveBiometricSession(
          token,
          user
        );

        setBiometricEnabledState(true);
      }
    } catch (err) {
      console.error(
        "Error activando biometría:",
        err
      );
    } finally {
      router.replace("/home");
    }
  }


  /* ============================================================
     LOGIN NORMAL
     ============================================================ */

  async function handleLogin() {
    if (loading) {
      return;
    }

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Introduce tu email y contraseña"
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await login(
          email.trim(),
          password
        );

      /**
       * Siempre establecemos la sesión actual
       * en memoria.
       */
      setSession(
        result.access_token,
        result.user
      );

      /**
       * Si el usuario quiere mantener la sesión,
       * también la guardamos de forma persistente.
       */
      if (rememberSession) {
        await saveToken(
          result.access_token
        );

        await saveUser(
          result.user
        );
      }

      /**
       * Si la biometría ya estaba activada, actualizamos siempre
       * sus credenciales con el nuevo token.
       *
       * "Mantener la sesión abierta" controla la sesión normal
       * persistente y NO debe desactivar ni romper la biometría.
       */
      const biometricAlreadyEnabled =
        await isBiometricEnabled();

      if (biometricAlreadyEnabled) {
        await saveBiometricSession(
          result.access_token,
          result.user
        );

        setBiometricEnabledState(true);

        router.replace("/home");

        return;
      }

      /**
       * Todavía no tiene la biometría activada: si el dispositivo
       * la soporta y nunca se le ha preguntado, se lo ofrecemos
       * ahora, justo después de este primer login con contraseña.
       */
      const yaPreguntado =
        await haSidoPreguntadaBiometria();

      if (
        biometricAvailable &&
        !yaPreguntado
      ) {
        offerBiometricSetup(
          result.access_token,
          result.user
        );

        return;
      }

      router.replace("/home");
    } catch (err: any) {
      console.error(err);

      if (
        err?.message?.includes("401")
      ) {
        setError(
          "Email o contraseña incorrectos"
        );
      } else {
        setError(
          "No se ha podido conectar con Siscentro"
        );
      }
    } finally {
      setLoading(false);
    }
  }


  /* ============================================================
     UI
     ============================================================ */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <View
        style={
          styles.backgroundCircle
        }
      />

      <View style={styles.content}>
        <View
          style={styles.logoContainer}
        >
          <View
            style={styles.logoIcon}
          >
            <Text
              style={
                styles.logoIconText
              }
            >
              S
            </Text>
          </View>

          <Text
            style={styles.logo}
          >
            SIScentro
          </Text>

          <Text
            style={styles.subtitle}
          >
            Control horario sencillo
          </Text>
        </View>

        <View style={styles.form}>
          <Text
            style={styles.welcome}
          >
            Bienvenido
          </Text>

          <Text
            style={styles.description}
          >
            Inicia sesión para registrar tu jornada.
          </Text>

          <View style={styles.field}>
            <Text
              style={styles.label}
            >
              Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={
                colors.inkFaint
              }
              value={email}
              onChangeText={
                setEmail
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text
              style={styles.label}
            >
              Contraseña
            </Text>

            <View
              style={
                styles.passwordContainer
              }
            >
              <TextInput
                style={
                  styles.passwordInput
                }
                placeholder="Tu contraseña"
                placeholderTextColor={
                  colors.inkFaint
                }
                value={password}
                onChangeText={
                  setPassword
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Pressable
                style={
                  styles.eyeButton
                }
                onPress={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                <Feather
                  name={
                    showPassword
                      ? "eye-off"
                      : "eye"
                  }
                  size={19}
                  color={
                    colors.inkMuted
                  }
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={
              styles.rememberRow
            }
            onPress={() =>
              setRememberSession(
                (value) =>
                  !value
              )
            }
            accessibilityRole="checkbox"
            accessibilityState={{
              checked:
                rememberSession,
            }}
          >
            <View
              style={[
                styles.checkbox,
                rememberSession &&
                  styles.checkboxChecked,
              ]}
            >
              {rememberSession ? (
                <Feather
                  name="check"
                  size={14}
                  color={
                    colors.surface
                  }
                />
              ) : null}
            </View>

            <Text
              style={
                styles.rememberText
              }
            >
              Mantener la sesión abierta
            </Text>
          </Pressable>

          {error ? (
            <View
              style={
                styles.errorBox
              }
            >
              <Feather
                name="alert-circle"
                size={16}
                color={
                  colors.danger
                }
              />

              <Text
                style={styles.error}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed &&
                styles.buttonPressed,
              loading &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleLogin
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color={
                  colors.surface
                }
              />
            ) : (
              <>
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  Entrar
                </Text>

                <Feather
                  name="arrow-right"
                  size={18}
                  color={
                    colors.surface
                  }
                  style={
                    styles.arrowIcon
                  }
                />
              </>
            )}
          </Pressable>

          {biometricAvailable &&
          biometricEnabled ? (
            <Pressable
              style={
                styles.biometricButton
              }
              onPress={
                handleBiometricLogin
              }
              disabled={loading}
            >
              <Ionicons
                name="finger-print-outline"
                size={20}
                color={colors.ink}
              />

              <Text
                style={
                  styles.biometricButtonText
                }
              >
                Acceder con biometría
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text
          style={styles.footer}
        >
          SIScentro · Control horario
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.canvas,
  },

  backgroundCircle: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor:
      colors.accentSoft,
    top: -130,
    right: -100,
  },

  content: {
    flex: 1,
    justifyContent:
      "center",
    paddingHorizontal: 24,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 42,
  },

  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor:
      colors.accent,
    alignItems: "center",
    justifyContent:
      "center",
    marginBottom: 14,
  },

  logoIconText: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: "800",
  },

  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.6,
  },

  subtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    marginTop: 5,
  },

  form: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 16,
    padding: 24,
  },

  welcome: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },

  description: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 6,
    marginBottom: 26,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    marginBottom: 8,
  },

  input: {
    height: 50,
    backgroundColor:
      colors.surfaceAlt,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15.5,
    color: colors.ink,
  },

  passwordContainer: {
    height: 50,
    backgroundColor:
      colors.surfaceAlt,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15.5,
    color: colors.ink,
  },

  eyeButton: {
    height: 50,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent:
      "center",
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 18,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor:
      colors.borderStrong,
    alignItems: "center",
    justifyContent:
      "center",
    marginRight: 10,
  },

  checkboxChecked: {
    backgroundColor:
      colors.accent,
    borderColor:
      colors.accent,
  },

  rememberText: {
    color: colors.inkMuted,
    fontSize: 14,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor:
      colors.surfaceAlt,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 10,
    padding: 11,
    marginBottom: 14,
  },

  error: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },

  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor:
      colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "center",
  },

  buttonPressed: {
    opacity: 0.88,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.surface,
    fontSize: 15.5,
    fontWeight: "700",
  },

  arrowIcon: {
    marginLeft: 8,
  },

  biometricButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "center",
    marginTop: 12,
    gap: 9,
  },

  biometricButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    color: colors.inkFaint,
    fontSize: 12,
    marginTop: 28,
  },
});