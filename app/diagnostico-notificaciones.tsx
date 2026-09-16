import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    DiagnosticoNotificaciones,
    obtenerDiagnosticoNotificaciones,
    programarPruebaDosMinutos,
} from "../src/storage/diagnosticoNotificaciones";

import { configurarNotificaciones } from "../src/storage/recordatorios";
import { colors } from "../src/theme";

export default function DiagnosticoNotificacionesScreen() {
  const [
    diagnostico,
    setDiagnostico,
  ] = useState<DiagnosticoNotificaciones | null>(
    null
  );

  const [cargando, setCargando] =
    useState(true);

  const [probando, setProbando] =
    useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);

      await configurarNotificaciones();

      const resultado =
        await obtenerDiagnosticoNotificaciones();

      setDiagnostico(resultado);
    } catch (error) {
      console.error(
        "Error diagnóstico:",
        error
      );

      Alert.alert(
        "Error",
        "No se ha podido obtener el diagnóstico."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function probarDosMinutos() {
    try {
      setProbando(true);

      const resultado =
        await programarPruebaDosMinutos();

      Alert.alert(
        "Prueba programada",
        `La notificación llegará aproximadamente a las ${resultado.fecha.toLocaleTimeString(
          "es-ES",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )}.\n\nAhora BLOQUEA EL MÓVIL y no abras Siscentro.\n\nSi aparece sin desbloquear, Android está entregando correctamente las alarmas.`,
        [
          {
            text: "Entendido",
          },
        ]
      );

      await cargar();
    } catch (error) {
      console.error(
        "Error prueba notificación:",
        error
      );

      Alert.alert(
        "Error en la prueba",
        error instanceof Error
          ? error.message
          : "No se ha podido programar la prueba."
      );
    } finally {
      setProbando(false);
    }
  }

async function abrirAlarmasExactas() {
  Alert.alert(
    "Alarmas exactas",
    Platform.OS === "android"
      ? "Comprueba en Ajustes de Android que Siscentro tenga permitidas las alarmas y recordatorios. Después vuelve a esta pantalla y pulsa «Volver a comprobar»."
      : "Esta configuración solo está disponible en Android."
  );
}

  if (cargando && !diagnostico) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
        <Text style={styles.loadingText}>
          Analizando notificaciones...
        </Text>
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
        >
          <Feather
            name="chevron-left"
            size={22}
            color={colors.ink}
          />
        </Pressable>

        <View>
          <Text style={styles.title}>
            Diagnóstico
          </Text>

          <Text style={styles.subtitle}>
            Notificaciones y alarmas
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningBox}>
          <Feather
            name="info"
            size={20}
            color={colors.accent}
          />

          <Text style={styles.warningText}>
            Esta pantalla sirve para comprobar si
            Android tiene correctamente configuradas
            las notificaciones de Siscentro.
          </Text>
        </View>

        {diagnostico ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Estado general
              </Text>

              <Fila
                titulo="Plataforma"
                valor={diagnostico.plataforma}
              />

              <Fila
                titulo="Notificaciones"
                valor={
                  diagnostico.permisoNotificaciones
                }
                ok={
                  diagnostico.permisoNotificaciones ===
                  "CONCEDIDO"
                }
              />

              <Fila
                titulo="Canal Android"
                valor={diagnostico.canalAndroid}
                ok={
                  diagnostico.canalAndroid !==
                  "NO EXISTE"
                }
              />

              <Fila
                titulo="Programadas"
                valor={String(
                  diagnostico.notificacionesProgramadas
                )}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Prueba real
              </Text>

              <Text style={styles.description}>
                Programa una notificación para dentro
                de 2 minutos. Después bloquea el
                móvil y no abras Siscentro.
              </Text>

              <Pressable
                style={[
                  styles.primaryButton,
                  probando &&
                    styles.buttonDisabled,
                ]}
                onPress={probarDosMinutos}
                disabled={probando}
              >
                {probando ? (
                  <ActivityIndicator
                    color={colors.surface}
                  />
                ) : (
                  <>
                    <Feather
                      name="bell"
                      size={18}
                      color={colors.surface}
                    />

                    <Text
                      style={styles.primaryText}
                    >
                      Probar en 2 minutos
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {Platform.OS === "android" && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Alarmas exactas
                </Text>

                <Text style={styles.description}>
                  Android puede exigir que el usuario
                  permita explícitamente las alarmas
                  exactas.
                </Text>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={abrirAlarmasExactas}
                >
                  <Feather
                    name="clock"
                    size={18}
                    color={colors.ink}
                  />

                  <Text
                    style={styles.secondaryText}
                  >
                    Abrir "Alarmas y recordatorios"
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  Notificaciones programadas
                </Text>

                <Pressable
                  onPress={cargar}
                  hitSlop={8}
                >
                  <Feather
                    name="refresh-cw"
                    size={18}
                    color={colors.inkMuted}
                  />
                </Pressable>
              </View>

              {diagnostico.programadas.length ===
              0 ? (
                <Text style={styles.empty}>
                  No hay notificaciones programadas.
                </Text>
              ) : (
                diagnostico.programadas.map(
                  (item) => (
                    <View
                      key={item.id}
                      style={styles.notification}
                    >
                      <View
                        style={
                          styles.notificationIcon
                        }
                      >
                        <Feather
                          name="bell"
                          size={16}
                          color={colors.accent}
                        />
                      </View>

                      <View
                        style={
                          styles.notificationInfo
                        }
                      >
                        <Text
                          style={
                            styles.notificationTitle
                          }
                        >
                          {item.titulo}
                        </Text>

                        <Text
                          style={
                            styles.notificationNext
                          }
                        >
                          Próxima:
                          {" "}
                          {item.proximaEjecucion}
                        </Text>

                        <Text
                          style={
                            styles.notificationTrigger
                          }
                          numberOfLines={4}
                        >
                          {item.trigger}
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>
          </>
        ) : null}

        <Pressable
          style={styles.refreshButton}
          onPress={cargar}
        >
          <Feather
            name="refresh-cw"
            size={17}
            color={colors.ink}
          />

          <Text style={styles.refreshText}>
            Volver a comprobar
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Fila({
  titulo,
  valor,
  ok,
}: {
  titulo: string;
  valor: string;
  ok?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>
        {titulo}
      </Text>

      <View style={styles.rowValue}>
        {ok !== undefined && (
          <Feather
            name={
              ok
                ? "check-circle"
                : "alert-circle"
            }
            size={16}
            color={
              ok
                ? colors.accent
                : colors.danger
            }
          />
        )}

        <Text style={styles.rowText}>
          {valor}
        </Text>
      </View>
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
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: colors.inkMuted,
  },

  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.inkMuted,
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  warningBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 12,
  },

  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginBottom: 14,
  },

  row: {
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  rowTitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },

  rowValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },

  rowText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "right",
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  primaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  secondaryText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  notification: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },

  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },

  notificationInfo: {
    flex: 1,
  },

  notificationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },

  notificationNext: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 3,
  },

  notificationTrigger: {
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 4,
  },

  empty: {
    color: colors.inkMuted,
    fontSize: 13,
  },

  refreshButton: {
    minHeight: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  refreshText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 13,
  },
});
