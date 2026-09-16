import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { authenticatedFetch } from "../src/api/client";
import { colors } from "../src/theme";

interface Fichaje {
  id: number;
  trabajador_id: number;
  centro_id: number | null;
  fecha_hora: string;
  tipo: "ENTRADA" | "SALIDA";
  origen: string;
  estado_registro: string;
  tipo_registro: string;
  fichaje_original_id: number | null;
  latitud: number | null;
  longitud: number | null;
  motivo: string | null;
}

interface FichajesResponse {
  items: Fichaje[];
  total: number;
  page: number;
  page_size: number;
}

interface Dia {
  fecha: string;
  fichajes: Fichaje[];
  horas: number;
  incompleto: boolean;
}

export default function HistorialScreen() {
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [mesActual, setMesActual] = useState(new Date());

  const cargarFichajes = useCallback(async () => {
    try {
      setError("");

      const response = await authenticatedFetch(
        "/fichajes?page=1&page_size=100"
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: FichajesResponse = await response.json();

      setFichajes(data.items);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "";

      // "No hay sesión" y "Sesión caducada" ya han sido gestionados
      // por authenticatedFetch (redirige a /login por su cuenta):
      // no mostramos ningún error, solo dejamos que navegue.
      if (
        mensaje === "No hay sesión" ||
        mensaje === "Sesión caducada"
      ) {
        return;
      }

      console.error(err);
      setError("No se ha podido cargar el historial");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarFichajes();
  }, [cargarFichajes]);

  async function refrescar() {
    setRefreshing(true);
    await cargarFichajes();
  }

  function cambiarMes(cantidad: number) {
    setMesActual(
      (actual) =>
        new Date(
          actual.getFullYear(),
          actual.getMonth() + cantidad,
          1
        )
    );
  }

  function formatearHora(fecha: string) {
    return new Date(fecha).toLocaleTimeString(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatearDia(fecha: string) {
    return new Date(fecha).toLocaleDateString(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );
  }

const fichajesMes = useMemo(() => {
  return fichajes.filter((fichaje) => {
    if (fichaje.estado_registro !== "ACTIVO") {
      return false;
    }

    const fecha = new Date(fichaje.fecha_hora);

    return (
      fecha.getMonth() === mesActual.getMonth() &&
      fecha.getFullYear() === mesActual.getFullYear()
    );
  });
}, [fichajes, mesActual]);

  const dias = useMemo(() => {
    const agrupados: Record<string, Fichaje[]> = {};

    for (const fichaje of fichajesMes) {
      const fecha = new Date(fichaje.fecha_hora);
      const clave = `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, "0")}-${String(
        fecha.getDate()
      ).padStart(2, "0")}`;

      if (!agrupados[clave]) {
        agrupados[clave] = [];
      }

      agrupados[clave].push(fichaje);
    }

    return Object.entries(agrupados)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, registros]): Dia => {
        const ordenados = [...registros].sort(
          (a, b) =>
            new Date(a.fecha_hora).getTime() -
            new Date(b.fecha_hora).getTime()
        );

        let horas = 0;

        for (
          let i = 0;
          i < ordenados.length - 1;
          i += 2
        ) {
          const entrada = ordenados[i];
          const salida = ordenados[i + 1];

          if (
            entrada?.tipo === "ENTRADA" &&
            salida?.tipo === "SALIDA"
          ) {
            horas +=
              (new Date(
                salida.fecha_hora
              ).getTime() -
                new Date(
                  entrada.fecha_hora
                ).getTime()) /
              3600000;
          }
        }

        return {
          fecha,
          fichajes: ordenados,
          horas,
          incompleto:
            ordenados.length > 0 &&
            ordenados[ordenados.length - 1]
              .tipo === "ENTRADA",
        };
      });
  }, [fichajesMes]);

  const totalHoras = dias.reduce(
    (total, dia) => total + dia.horas,
    0
  );

  const totalFichajes = fichajesMes.length;

  const formatearHoras = (horas: number) => {
    const horasEnteras = Math.floor(horas);
    const minutos = Math.round(
      (horas - horasEnteras) * 60
    );

    return `${horasEnteras} h ${minutos
      .toString()
      .padStart(2, "0")} min`;
  };

  const nombreMes = mesActual.toLocaleDateString(
    "es-ES",
    {
      month: "long",
      year: "numeric",
    }
  );

  function seleccionarFichaje(fichaje: Fichaje) {
    const etiquetaTipo =
      fichaje.tipo === "ENTRADA"
        ? "Entrada"
        : "Salida";

    const etiquetaHora = formatearHora(
      fichaje.fecha_hora
    );

    Alert.alert(
      `${etiquetaTipo} · ${etiquetaHora}`,
      "¿Qué quieres hacer con este fichaje?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Modificar",
          onPress: () =>
            router.push({
              pathname: "/correcciones",
              params: {
                modo: "modificar",
                fichajeId: String(fichaje.id),
                tipo: fichaje.tipo,
                fechaHora: fichaje.fecha_hora,
              },
            }),
        },
        {
          text: "Anular fichaje",
          style: "destructive",
          onPress: () =>
            router.push({
              pathname: "/correcciones",
              params: {
                modo: "anular",
                fichajeId: String(fichaje.id),
                tipo: fichaje.tipo,
                fechaHora: fichaje.fecha_hora,
              },
            }),
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
          <Text style={styles.title}>
            Historial
          </Text>

          <Text style={styles.subtitle}>
            Tus fichajes y horas trabajadas
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.monthSelector}>
        <Pressable
          style={styles.monthButton}
          onPress={() => cambiarMes(-1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Feather
            name="chevron-left"
            size={20}
            color={colors.ink}
          />
        </Pressable>

        <Text style={styles.monthTitle}>
          {nombreMes.charAt(0).toUpperCase() +
            nombreMes.slice(1)}
        </Text>

        <Pressable
          style={styles.monthButton}
          onPress={() => cambiarMes(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Feather
            name="chevron-right"
            size={20}
            color={colors.ink}
          />
        </Pressable>
        </View>

        <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refrescar}
            tintColor={colors.accent}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Feather
              name="alert-circle"
              size={18}
              color={colors.danger}
            />
            <Text style={styles.error}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {formatearHoras(totalHoras)}
            </Text>
            <Text style={styles.summaryLabel}>
              Horas trabajadas
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {dias.length}
            </Text>
            <Text style={styles.summaryLabel}>
              Días trabajados
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {totalFichajes}
            </Text>
            <Text style={styles.summaryLabel}>
              Fichajes
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Actividad
          </Text>

          <Text style={styles.sectionSubtitle}>
            {dias.length === 1
              ? "1 jornada"
              : `${dias.length} jornadas`}
          </Text>
        </View>

        {dias.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather
                name="calendar"
                size={26}
                color={colors.inkFaint}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No hay fichajes este mes
            </Text>

            <Text style={styles.emptyText}>
              Cuando realices fichajes aparecerán
              aquí.
            </Text>
          </View>
        ) : (
          dias.map((dia) => (
            <View
              key={dia.fecha}
              style={styles.dayCard}
            >
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayName}>
                    {formatearDia(
                      `${dia.fecha}T12:00:00`
                    )}
                  </Text>

                  <Text style={styles.dayHours}>
                    {dia.horas > 0
                      ? formatearHoras(
                          dia.horas
                        )
                      : "Jornada incompleta"}
                  </Text>
                </View>

                {dia.incompleto ? (
                  <View style={styles.warningBadge}>
                    <Feather
                      name="alert-triangle"
                      size={13}
                      color={colors.danger}
                    />

                    <Text
                      style={
                        styles.warningText
                      }
                    >
                      Incompleto
                    </Text>
                  </View>
                ) : (
                  <Feather
                    name="check"
                    size={17}
                    color={colors.inkFaint}
                  />
                )}
              </View>

              <View style={styles.timeline}>
                {dia.fichajes.map(
                  (fichaje, index) => (
                    <Pressable
                      key={fichaje.id}
                      style={({ pressed }) => [
                        styles.timelineItem,
                        pressed &&
                          styles.timelineItemPressed,
                      ]}
                      onPress={() =>
                        seleccionarFichaje(
                          fichaje
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${
                        fichaje.tipo === "ENTRADA"
                          ? "Entrada"
                          : "Salida"
                      } a las ${formatearHora(
                        fichaje.fecha_hora
                      )}. Toca para modificar o anular.`}
                    >
                      <View
                        style={
                          styles.timelineLeft
                        }
                      >
                        <View
                          style={[
                            styles.timelineDot,
                            fichaje.tipo ===
                            "ENTRADA"
                              ? styles.entryDot
                              : styles.exitDot,
                          ]}
                        />

                        {index <
                        dia.fichajes.length -
                          1 ? (
                          <View
                            style={
                              styles.timelineLine
                            }
                          />
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.timelineContent
                        }
                      >
                        <View>
                          <View
                            style={
                              styles.fichajeTypeRow
                            }
                          >
                            <Text
                              style={
                                styles.fichajeType
                              }
                            >
                              {fichaje.tipo ===
                              "ENTRADA"
                                ? "Entrada"
                                : "Salida"}
                            </Text>

                            {fichaje.fichaje_original_id !=
                            null ? (
                              <View
                                style={
                                  styles.correctedBadge
                                }
                              >
                                <Feather
                                  name="edit-3"
                                  size={10}
                                  color={
                                    colors.inkMuted
                                  }
                                />
                                <Text
                                  style={
                                    styles.correctedBadgeText
                                  }
                                >
                                  Corregido
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text
                            style={
                              styles.fichajeOrigin
                            }
                          >
                            {fichaje.origen}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.fichajeTimeGroup
                          }
                        >
                          <Text
                            style={
                              styles.fichajeTime
                            }
                          >
                            {formatearHora(
                              fichaje.fecha_hora
                            )}
                          </Text>

                          <Feather
                            name="chevron-right"
                            size={16}
                            color={
                              colors.inkFaint
                            }
                          />
                        </View>
                      </View>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },

  monthSelector: {
    height: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 16,
  },

  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },

  error: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },

  summary: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 26,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 5,
  },

  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10.5,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: colors.inkFaint,
  },

  dayCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  dayName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
    textTransform: "capitalize",
  },

  dayHours: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 4,
  },

  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  warningText: {
    color: colors.danger,
    fontSize: 10.5,
    fontWeight: "600",
  },

  timeline: {
    paddingTop: 14,
  },

  timelineItem: {
    flexDirection: "row",
    minHeight: 54,
  },

  timelineItemPressed: {
    opacity: 0.6,
  },

  timelineLeft: {
    width: 26,
    alignItems: "center",
  },

  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
  },

  entryDot: {
    backgroundColor: colors.accent,
  },

  exitDot: {
    backgroundColor: colors.borderStrong,
  },

  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 3,
  },

  timelineContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
  },

  fichajeTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  correctedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  correctedBadgeText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: colors.inkMuted,
  },

  fichajeType: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },

  fichajeOrigin: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },

  fichajeTimeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  fichajeTime: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginTop: 4,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 19,
  },

  bottomSpace: {
    height: 30,
  },
});