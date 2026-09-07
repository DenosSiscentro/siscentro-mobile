import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../src/theme";

import {
  crearFichaje,
  Fichaje,
  getMisCorreccionesPendientes,
  getUltimoFichaje,
} from "../src/api/fichajes";

import { getUser, logout } from "../src/storage/auth";
import { Usuario } from "../src/types/auth";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [ultimoFichaje, setUltimoFichaje] =
    useState<Fichaje | null>(null);

  const [loading, setLoading] = useState(true);
  const [fichando, setFichando] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  const [tipoRealizado, setTipoRealizado] = useState<
    "ENTRADA" | "SALIDA" | null
  >(null);

  const [error, setError] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [usarGps, setUsarGps] = useState(true);

  const [correccionesPendientes, setCorreccionesPendientes] =
    useState(0);

  async function cargarCorreccionesPendientes() {
    try {
      const datos =
        await getMisCorreccionesPendientes();

      setCorreccionesPendientes(datos.length);
    } catch (err) {
      // No bloqueamos la pantalla principal si esto falla:
      // simplemente no mostramos el aviso.
      console.error(err);
    }
  }

  async function cargarUltimoFichaje() {
    try {
      setError("");

      const fichaje = await getUltimoFichaje();

      setUltimoFichaje(fichaje);
    } catch (err) {
      console.error(err);
      setError(
        "No se ha podido cargar tu último fichaje"
      );
    } finally {
      setLoading(false);
    }
  }

  async function cargarUsuario() {
    try {
      const user = await getUser();
      setUsuario(user);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFichaje(
    tipo: "ENTRADA" | "SALIDA"
  ) {
    try {
      setFichando(true);
      setError("");

      let latitud: number | null = null;
      let longitud: number | null = null;

      if (usarGps) {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (
          status !==
          Location.PermissionStatus.GRANTED
        ) {
          setError(
            "Necesitamos permiso de ubicación para registrar el fichaje con GPS"
          );
          return;
        }

        const location =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        latitud = location.coords.latitude;
        longitud = location.coords.longitude;
      }

      const fichaje = await crearFichaje(
        tipo,
        latitud,
        longitud
      );

      setUltimoFichaje(fichaje);
      setTipoRealizado(tipo);

      setTimeout(() => {
        setTipoRealizado(null);
      }, 2200);
    } catch (err) {
      console.error(err);
      setError(
        "No se ha podido registrar el fichaje"
      );
    } finally {
      setFichando(false);
    }
  }

  function handleLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Quieres cerrar tu sesión en Siscentro?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
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

  useEffect(() => {
    cargarUltimoFichaje();
    cargarUsuario();
    cargarCorreccionesPendientes();
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAhora(new Date());
    }, 1000);

    return () => {
      clearInterval(intervalo);
    };
  }, []);

  function formatearHora(fecha: string) {
    return new Date(fecha).toLocaleTimeString(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function saludo() {
    const hora = ahora.getHours();

    if (hora < 12) {
      return "Buenos días";
    }

    if (hora < 20) {
      return "Buenas tardes";
    }

    return "Buenas noches";
  }

  function formatearFechaFichaje(
    fecha: string
  ) {
    const fechaFichaje = new Date(fecha);
    const hoy = new Date();

    const mismoDia =
      fechaFichaje.getDate() === hoy.getDate() &&
      fechaFichaje.getMonth() === hoy.getMonth() &&
      fechaFichaje.getFullYear() ===
        hoy.getFullYear();

    if (mismoDia) {
      return "Hoy";
    }

    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);

    const esAyer =
      fechaFichaje.getDate() === ayer.getDate() &&
      fechaFichaje.getMonth() === ayer.getMonth() &&
      fechaFichaje.getFullYear() ===
        ayer.getFullYear();

    if (esAyer) {
      return "Ayer";
    }

    return fechaFichaje.toLocaleDateString(
      "es-ES",
      {
        day: "numeric",
        month: "short",
      }
    );
  }

  // La acción que probablemente toca ahora: si el último fichaje fue una
  // entrada, lo lógico es que ahora venga una salida (y viceversa). Esto
  // decide qué botón mostramos como principal, para que el trabajador no
  // tenga que pensar cuál le toca.
  const siguienteAccion: "ENTRADA" | "SALIDA" =
    ultimoFichaje?.tipo === "ENTRADA"
      ? "SALIDA"
      : "ENTRADA";

  const otraAccion: "ENTRADA" | "SALIDA" =
    siguienteAccion === "ENTRADA"
      ? "SALIDA"
      : "ENTRADA";

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

  if (tipoRealizado) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successCircle}>
          <Feather
            name="check"
            size={44}
            color={colors.confirm}
          />
        </View>

        <Text style={styles.successTitle}>
          {tipoRealizado} registrada
        </Text>

        <Text style={styles.successTime}>
          {ultimoFichaje
            ? formatearHora(
                ultimoFichaje.fecha_hora
              )
            : ""}
        </Text>

        <Text style={styles.successSubtitle}>
          Tu fichaje se ha registrado
          correctamente
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.brand}>
            SIScentro
          </Text>

          <Text style={styles.greeting}>
            {saludo()}
            {usuario?.nombre
              ? ", " + usuario.nombre
              : ""}
          </Text>

          <Text style={styles.clock}>
            {ahora.toLocaleTimeString(
              "es-ES",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </Text>

          <Text style={styles.today}>
            {ahora.toLocaleDateString(
              "es-ES",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
              }
            )}
          </Text>
        </View>

        <Pressable
          style={styles.profile}
          onPress={handleLogout}
          hitSlop={8}
        >
          <Feather
            name="log-out"
            size={19}
            color={colors.inkMuted}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom:
              insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gpsOption}>
          <View style={styles.gpsInfo}>
            <Feather
              name="map-pin"
              size={18}
              color={colors.inkMuted}
            />

            <View style={styles.gpsTextGroup}>
              <Text style={styles.gpsTitle}>
                Ubicación GPS
              </Text>

              <Text style={styles.gpsSubtitle}>
                {usarGps
                  ? "Se enviará tu posición al fichar"
                  : "No se enviará tu posición"}
              </Text>
            </View>
          </View>

          <Switch
            value={usarGps}
            onValueChange={setUsarGps}
            trackColor={{
              false: colors.border,
              true: colors.accent,
            }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>

        <View style={styles.lastCard}>
          <View>
            <Text style={styles.lastLabel}>
              Último fichaje
            </Text>

            {ultimoFichaje ? (
              <>
                <Text style={styles.lastType}>
                  {ultimoFichaje.tipo}
                </Text>

                <Text style={styles.lastDate}>
                  {formatearFechaFichaje(
                    ultimoFichaje.fecha_hora
                  )}
                  {" · "}
                  {formatearHora(
                    ultimoFichaje.fecha_hora
                  )}
                </Text>
              </>
            ) : (
              <Text style={styles.noLast}>
                Todavía no tienes fichajes
              </Text>
            )}
          </View>

          <View
            style={[
              styles.statusDot,
              ultimoFichaje?.tipo ===
                "ENTRADA" &&
                styles.statusDotActive,
            ]}
          />
        </View>

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        {renderBotonFichaje(
          siguienteAccion,
          true
        )}

        {renderBotonFichaje(
          otraAccion,
          false
        )}

        <View style={styles.linksContainer}>
          <Pressable
            style={styles.linkRow}
            onPress={() => {
              router.push("/historial");
            }}
          >
            <Feather
              name="clock"
              size={18}
              color={colors.inkMuted}
            />

            <Text style={styles.linkText}>
              Ver mis fichajes
            </Text>

            <Feather
              name="chevron-right"
              size={18}
              color={colors.inkFaint}
            />
          </Pressable>

          <View style={styles.linkDivider} />

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              router.push("/correcciones");
            }}
          >
            <Feather
              name="edit-3"
              size={18}
              color={colors.inkMuted}
            />

            <Text style={styles.linkText}>
              Correcciones
            </Text>

            {correccionesPendientes > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {correccionesPendientes}
                </Text>
              </View>
            )}

            <Feather
              name="chevron-right"
              size={18}
              color={colors.inkFaint}
            />
          </Pressable>

          <View style={styles.linkDivider} />

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              router.push("/recordatorios");
            }}
          >
            <Feather
              name="bell"
              size={18}
              color={colors.inkMuted}
            />

            <Text style={styles.linkText}>
              Mis recordatorios
            </Text>

            <Feather
              name="chevron-right"
              size={18}
              color={colors.inkFaint}
            />
          </Pressable>
        </View>

        {fichando && (
          <View style={styles.overlay}>
            <ActivityIndicator
              size="large"
              color={colors.surface}
            />

            <Text
              style={styles.overlayText}
            >
              Registrando...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  // Botón de fichaje: uno grande y "primary" para la acción esperada,
  // uno más discreto ("secondary") para la otra, por si hay que corregir.
  function renderBotonFichaje(
    tipo: "ENTRADA" | "SALIDA",
    principal: boolean
  ) {
    const icono =
      tipo === "ENTRADA" ? "log-in" : "log-out";

    const etiqueta =
      tipo === "ENTRADA"
        ? "Registrar entrada"
        : "Registrar salida";

    return (
      <Pressable
        style={({ pressed }) => [
          principal
            ? styles.actionPrimary
            : styles.actionSecondary,
          pressed && styles.actionPressed,
          fichando && styles.disabled,
        ]}
        disabled={fichando}
        onPress={() => {
          handleFichaje(tipo);
        }}
      >
        <View
          style={
            principal
              ? styles.actionIconPrimary
              : styles.actionIconSecondary
          }
        >
          <Feather
            name={icono}
            size={20}
            color={
              principal
                ? colors.surface
                : colors.inkMuted
            }
          />
        </View>

        <View style={styles.actionText}>
          <Text
            style={
              principal
                ? styles.actionTitlePrimary
                : styles.actionTitleSecondary
            }
          >
            {tipo}
          </Text>

          <Text
            style={
              principal
                ? styles.actionSubtitlePrimary
                : styles.actionSubtitleSecondary
            }
          >
            {etiqueta}
          </Text>
        </View>

        <Feather
          name="chevron-right"
          size={22}
          color={
            principal
              ? "rgba(255,255,255,0.7)"
              : colors.inkFaint
          }
        />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: 20,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },

  header: {
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerInfo: {
    flex: 1,
  },

  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
  },

  greeting: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 3,
  },

  profile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    marginTop: 2,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 12,
  },

  clock: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 18,
    letterSpacing: -1,
  },

  today: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },

  gpsOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 14,
  },

  gpsInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  gpsTextGroup: {
    marginLeft: 12,
    flex: 1,
  },

  gpsTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.ink,
  },

  gpsSubtitle: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },

  lastCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  lastLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.inkFaint,
    marginBottom: 6,
  },

  lastType: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.ink,
  },

  lastDate: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 3,
  },

  noLast: {
    fontSize: 14,
    color: colors.inkMuted,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderStrong,
  },

  statusDotActive: {
    backgroundColor: colors.accent,
  },

  actionPrimary: {
    height: 84,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 10,
  },

  actionSecondary: {
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  actionIconPrimary: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  actionIconSecondary: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },

  actionText: {
    flex: 1,
    marginLeft: 14,
  },

  actionTitlePrimary: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.surface,
    letterSpacing: 0.2,
  },

  actionSubtitlePrimary: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  actionTitleSecondary: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkMuted,
  },

  actionSubtitleSecondary: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },

  actionPressed: {
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.6,
  },

  linksContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  linkRow: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  linkDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  linkText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.ink,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.surface,
  },

  error: {
    color: colors.danger,
    textAlign: "center",
    marginBottom: 12,
    fontSize: 13.5,
  },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  overlayText: {
    color: colors.surface,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  successScreen: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.confirmSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    textTransform: "capitalize",
  },

  successTime: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 8,
  },

  successSubtitle: {
    fontSize: 14.5,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 12,
  },
});