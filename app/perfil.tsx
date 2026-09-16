import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  getToken,
  getUser,
  isBiometricEnabled,
  logout,
  saveBiometricSession,
  setBiometricEnabled,
} from "../src/storage/auth";
import { colors } from "../src/theme";
import { Usuario } from "../src/types/auth";


export default function PerfilScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  const [biometricAvailable, setBiometricAvailable] =
    useState(false);

  const [biometricEnabled, setBiometricEnabledState] =
    useState(false);

  const [procesandoBiometria, setProcesandoBiometria] =
    useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const user = await getUser();
        setUsuario(user);

        const compatible =
          await LocalAuthentication.hasHardwareAsync();

        const enrolled =
          await LocalAuthentication.isEnrolledAsync();

        const enabled = await isBiometricEnabled();

        setBiometricAvailable(
          compatible && enrolled
        );
        setBiometricEnabledState(enabled);
      } catch (error) {
        console.error(
          "Error cargando el perfil:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    cargar();
  }, []);

  async function alternarBiometria(
    valor: boolean
  ) {
    if (!valor) {
      // Desactivar no requiere confirmación biométrica.
      await setBiometricEnabled(false);
      setBiometricEnabledState(false);
      return;
    }

    try {
      setProcesandoBiometria(true);

      const resultado =
        await LocalAuthentication.authenticateAsync({
          promptMessage:
            "Confirma tu huella o Face ID para activarla",
          cancelLabel: "Cancelar",
        });

      if (!resultado.success) {
        return;
      }

      const token = await getToken();
      const usuarioActual = await getUser();

      if (!token || !usuarioActual) {
        Alert.alert(
          "No se ha podido activar",
          "Cierra sesión y vuelve a entrar con tu contraseña antes de activarla."
        );
        return;
      }

      await saveBiometricSession(
        token,
        usuarioActual
      );

      await setBiometricEnabled(true);
      setBiometricEnabledState(true);
    } catch (error) {
      console.error(
        "Error activando biometría:",
        error
      );

      Alert.alert(
        "Error",
        "No se ha podido activar el acceso con huella o Face ID."
      );
    } finally {
      setProcesandoBiometria(false);
    }
  }

  function handleLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Quieres cerrar tu sesión en Siscentro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather
            name="chevron-left"
            size={22}
            color={colors.ink}
          />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Perfil</Text>

          <Text style={styles.subtitle}>
            Tu cuenta y ajustes de acceso
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Feather
              name="user"
              size={22}
              color={colors.inkMuted}
            />
          </View>

          <Text style={styles.userName}>
            {usuario?.nombre ?? "Trabajador"}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>
          Acceso
        </Text>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Huella / Face ID
              </Text>

              <Text style={styles.settingSubtitle}>
                {biometricAvailable
                  ? "Accede más rápido sin escribir tu contraseña"
                  : "Tu dispositivo no tiene huella ni Face ID configurados"}
              </Text>
            </View>

            {procesandoBiometria ? (
              <ActivityIndicator
                color={colors.accent}
              />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={alternarBiometria}
                disabled={!biometricAvailable}
                trackColor={{
                  false: colors.border,
                  true: colors.accent,
                }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
              />
            )}
          </View>
        </View>
<Text style={styles.sectionLabel}>
  Ayuda
</Text>

<Pressable
  style={({ pressed }) => [
    styles.helpButton,
    pressed && styles.helpButtonPressed,
  ]}
  onPress={() => {
    router.replace({
      pathname: "/home",
      params: { mostrarGuia: "1" },
    });
  }}
>
  <View style={styles.helpIcon}>
    <Feather
      name="book-open"
      size={19}
      color={colors.accent}
    />
  </View>

  <View style={styles.helpInfo}>
    <Text style={styles.helpTitle}>
      Guía de la aplicación
    </Text>

    <Text style={styles.helpSubtitle}>
      Aprende a utilizar las principales funciones de SIScentro
    </Text>
  </View>

  <Feather
    name="chevron-right"
    size={20}
    color={colors.inkMuted}
  />
</Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={handleLogout}
        >
          <Feather
            name="log-out"
            size={18}
            color={colors.danger}
          />

          <Text style={styles.logoutText}>
            Cerrar sesión
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginLeft: -6,
  },

  headerTitleContainer: {
    flex: 1,
  },

  title: {
    fontSize: 21,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.2,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13.5,
    color: colors.inkMuted,
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  userCard: {
    alignItems: "center",
    paddingVertical: 24,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    marginBottom: 10,
  },

  settingsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  settingInfo: {
    flex: 1,
    marginRight: 12,
  },

  settingTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.ink,
  },

  settingSubtitle: {
    fontSize: 12.5,
    color: colors.inkMuted,
    marginTop: 3,
  },

  logoutButton: {
    marginTop: 28,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutButtonPressed: {
    opacity: 0.7,
  },

  logoutText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.danger,
  },
  helpButton: {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  flexDirection: "row",
  alignItems: "center",
},

helpButtonPressed: {
  opacity: 0.7,
},

helpIcon: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.canvas,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

helpInfo: {
  flex: 1,
  marginRight: 8,
},

helpTitle: {
  fontSize: 14.5,
  fontWeight: "600",
  color: colors.ink,
},

helpSubtitle: {
  fontSize: 12.5,
  color: colors.inkMuted,
  marginTop: 3,
  lineHeight: 18,
},
});