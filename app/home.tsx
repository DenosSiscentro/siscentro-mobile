import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  crearFichaje,
  Fichaje,
  getUltimoFichaje,
} from "../src/api/fichajes";
import { getUser, logout } from "../src/storage/auth";
import { Usuario } from "../src/types/auth";

export default function HomeScreen() {
  const [ultimoFichaje, setUltimoFichaje] = useState<Fichaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [fichando, setFichando] = useState(false);
  const [ahora, setAhora] = useState(new Date());
  const [tipoRealizado, setTipoRealizado] = useState<
    "ENTRADA" | "SALIDA" | null
  >(null);
  const [error, setError] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
const [usarGps, setUsarGps] = useState(true);
  async function cargarUltimoFichaje() {
    try {
      setError("");

      const fichaje = await getUltimoFichaje();

      setUltimoFichaje(fichaje);
    } catch (err) {
      console.error(err);
      setError("No se ha podido cargar tu último fichaje");
    } finally {
      setLoading(false);
    }
  }

async function handleFichaje(tipo: "ENTRADA" | "SALIDA") {
  try {
    setFichando(true);
    setError("");

    let latitud: number | null = null;
let longitud: number | null = null;

if (usarGps) {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== Location.PermissionStatus.GRANTED) {
    setError(
      "Necesitamos permiso de ubicación para registrar el fichaje con GPS"
    );
    return;
  }

  const location = await Location.getCurrentPositionAsync({
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
      setError("No se ha podido registrar el fichaje");
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

  async function cargarUsuario() {
    const user = await getUser();
    setUsuario(user);
  }

  cargarUsuario();
}, []);

  useEffect(() => {
  const intervalo = setInterval(() => {
    setAhora(new Date());
  }, 1000);

  return () => clearInterval(intervalo);
}, []);

  function formatearHora(fecha: string) {
    return new Date(fecha).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function saludo() {
    const hora = new Date().getHours();

    if (hora < 12) return "Buenos días";
    if (hora < 20) return "Buenas tardes";
    return "Buenas noches";
  }

function formatearFechaFichaje(fecha: string) {
  const fechaFichaje = new Date(fecha);
  const hoy = new Date();

  const mismoDia =
    fechaFichaje.getDate() === hoy.getDate() &&
    fechaFichaje.getMonth() === hoy.getMonth() &&
    fechaFichaje.getFullYear() === hoy.getFullYear();

  if (mismoDia) {
    return "Hoy";
  }

  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const esAyer =
    fechaFichaje.getDate() === ayer.getDate() &&
    fechaFichaje.getMonth() === ayer.getMonth() &&
    fechaFichaje.getFullYear() === ayer.getFullYear();

  if (esAyer) {
    return "Ayer";
  }

  return fechaFichaje.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (tipoRealizado) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successCircle}>
          <Text style={styles.successCheck}>✓</Text>
        </View>

        <Text style={styles.successTitle}>
          {tipoRealizado} registrada
        </Text>

        <Text style={styles.successTime}>
          {ultimoFichaje
            ? formatearHora(ultimoFichaje.fecha_hora)
            : ""}
        </Text>

        <Text style={styles.successSubtitle}>
          Tu fichaje se ha registrado correctamente
        </Text>
      </View>
    );
  }

  return (
  <View style={styles.container}>

    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>SIScentro</Text>
        <Text style={styles.greeting}>
  {saludo()}, {usuario?.nombre || ""}
</Text>

        <Text style={styles.clock}>
          {ahora.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        <Text style={styles.today}>
          {ahora.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>
        <Text style={styles.environment}>SIScentro · Producción</Text>
      </View>

      <Pressable style={styles.profile} onPress={handleLogout}>
        <Text style={styles.profileText}>👤</Text>
      </Pressable>
    </View>

    <View style={styles.content}>
      <Text style={styles.question}>¿Qué quieres hacer?</Text>
<Pressable
  style={styles.gpsOption}
  onPress={() => setUsarGps((valor) => !valor)}
>
  <View style={styles.gpsInfo}>
    <Text style={styles.gpsIcon}>📍</Text>

    <View>
      <Text style={styles.gpsTitle}>Ubicación GPS</Text>
      <Text style={styles.gpsSubtitle}>
        {usarGps
          ? "Se enviará tu posición al fichar"
          : "No se enviará tu posición"}
      </Text>
    </View>
  </View>

  <View
    style={[
      styles.gpsSwitch,
      usarGps && styles.gpsSwitchActive,
    ]}
  >
    <View
      style={[
        styles.gpsSwitchThumb,
        usarGps && styles.gpsSwitchThumbActive,
      ]}
    />
  </View>
</Pressable>
      {/* resto del contenido */}

        <View style={styles.lastCard}>
          <View>
            <Text style={styles.lastLabel}>ÚLTIMO FICHAJE</Text>

            {ultimoFichaje ? (
              <>
                <Text style={styles.lastType}>
                  {ultimoFichaje.tipo}
                </Text>

                <Text style={styles.lastDate}>
  {formatearFechaFichaje(ultimoFichaje.fecha_hora)} ·{" "}
  {formatearHora(ultimoFichaje.fecha_hora)}
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
              ultimoFichaje?.tipo === "SALIDA" &&
                styles.statusDotSalida,
            ]}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.entradaButton,
            pressed && styles.actionPressed,
            fichando && styles.disabled,
          ]}
          disabled={fichando}
          onPress={() => handleFichaje("ENTRADA")}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>↓</Text>
          </View>

          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>ENTRADA</Text>
            <Text style={styles.actionSubtitle}>
              Registrar entrada
            </Text>
          </View>

          <Text style={styles.actionArrow}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.salidaButton,
            pressed && styles.actionPressed,
            fichando && styles.disabled,
          ]}
          disabled={fichando}
          onPress={() => handleFichaje("SALIDA")}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>↑</Text>
          </View>

          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>SALIDA</Text>
            <Text style={styles.actionSubtitle}>
              Registrar salida
            </Text>
          </View>

          <Text style={styles.actionArrow}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.historyButton,
            pressed && styles.historyPressed,
          ]}
          onPress={() => router.push("/historial")}
        >
          <Text style={styles.historyIcon}>☷</Text>
          <Text style={styles.historyText}>Ver mis fichajes</Text>
          <Text style={styles.historyArrow}>›</Text>
        </Pressable>
      </View>

      {fichando && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.overlayText}>Registrando...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
    paddingHorizontal: 20,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
      transform: [{ translateY: -8 }],

  },

  header: {
    paddingTop: 62,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  greeting: {
    fontSize: 14,
    color: "#737983",
    marginTop: 3,
  },

  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  profileText: {
    fontSize: 20,
  },

  content: {
    flex: 1,
    justifyContent: "center",
  },

  question: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 18,
  },

  lastCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  lastLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9AA0A8",
    letterSpacing: 1,
    marginBottom: 7,
  },

  lastType: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  lastDate: {
    fontSize: 14,
    color: "#737983",
    marginTop: 4,
  },

  noLast: {
    fontSize: 14,
    color: "#737983",
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
  },

  statusDotSalida: {
    backgroundColor: "#F97316",
  },

  actionButton: {
    height: 86,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  entradaButton: {
    backgroundColor: "#DDF7E7",
  },

  salidaButton: {
    backgroundColor: "#FDE5E5",
  },

  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  actionIconText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  actionText: {
    flex: 1,
    marginLeft: 15,
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  actionSubtitle: {
    fontSize: 13,
    color: "#737983",
    marginTop: 3,
  },

  actionArrow: {
    fontSize: 30,
    color: "#737983",
    fontWeight: "300",
  },

  actionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.6,
  },

  historyButton: {
    height: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 10,
  },

  historyPressed: {
    opacity: 0.7,
  },

  historyIcon: {
    fontSize: 23,
    color: "#111827",
  },

  historyText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  historyArrow: {
    fontSize: 28,
    color: "#9AA0A8",
  },

  error: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 10,
  },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  overlayText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  successScreen: {
    flex: 1,
    backgroundColor: "#F6F7F9",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DDF7E7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  successCheck: {
    fontSize: 54,
    color: "#16A34A",
    fontWeight: "700",
  },

  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    textTransform: "capitalize",
  },

  successTime: {
    fontSize: 42,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
  },

  successSubtitle: {
    fontSize: 15,
    color: "#737983",
    textAlign: "center",
    marginTop: 12,
  },
  clock: {
  fontSize: 42,
  fontWeight: "800",
  color: "#111827",
  marginTop: 18,
  letterSpacing: -1,
},

today: {
  fontSize: 14,
  color: "#737983",
  marginTop: 2,
  textTransform: "capitalize",
},

environment: {
  fontSize: 11,
  color: "#9CA3AF",
  marginTop: 4,
},
gpsOption: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 18,
},

gpsInfo: {
  flexDirection: "row",
  alignItems: "center",
},

gpsIcon: {
  fontSize: 22,
  marginRight: 12,
},

gpsTitle: {
  fontSize: 15,
  fontWeight: "700",
  color: "#111827",
},

gpsSubtitle: {
  fontSize: 12,
  color: "#737983",
  marginTop: 3,
},

gpsSwitch: {
  width: 48,
  height: 28,
  borderRadius: 14,
  backgroundColor: "#D1D5DB",
  padding: 3,
  justifyContent: "center",
},

gpsSwitchActive: {
  backgroundColor: "#22C55E",
},

gpsSwitchThumb: {
  width: 22,
  height: 22,
  borderRadius: 11,
  backgroundColor: "#FFFFFF",
},

gpsSwitchThumbActive: {
  alignSelf: "flex-end",
},
});