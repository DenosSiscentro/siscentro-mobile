import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getToken } from "../src/storage/auth";

const API_URL = "https://ncontrol.siscentro.com/api/v1";

interface Fichaje {
  id: number;
  trabajador_id: number;
  centro_id: number | null;
  fecha_hora: string;
  tipo: "ENTRADA" | "SALIDA";
  origen: string;
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
  const insets = useSafeAreaInsets();
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [mesActual, setMesActual] = useState(new Date());

  const cargarFichajes = useCallback(async () => {
    try {
      setError("");

      const token = await getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/fichajes?page=1&page_size=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: FichajesResponse = await response.json();

      setFichajes(data.items);
    } catch (err) {
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
        new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1)
    );
  }

  function formatearHora(fecha: string) {
    return new Date(fecha).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatearDia(fecha: string) {
    return new Date(fecha).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const fichajesMes = useMemo(() => {
    return fichajes.filter((fichaje) => {
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
      ).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

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

        for (let i = 0; i < ordenados.length - 1; i += 2) {
          const entrada = ordenados[i];
          const salida = ordenados[i + 1];

          if (
            entrada?.tipo === "ENTRADA" &&
            salida?.tipo === "SALIDA"
          ) {
            horas +=
              (new Date(salida.fecha_hora).getTime() -
                new Date(entrada.fecha_hora).getTime()) /
              3600000;
          }
        }

        return {
          fecha,
          fichajes: ordenados,
          horas,
          incompleto:
            ordenados.length > 0 &&
            ordenados[ordenados.length - 1].tipo === "ENTRADA",
        };
      });
  }, [fichajesMes]);

  const totalHoras = dias.reduce((total, dia) => total + dia.horas, 0);

  const totalFichajes = fichajesMes.length;

  const formatearHoras = (horas: number) => {
    const horasEnteras = Math.floor(horas);
    const minutos = Math.round((horas - horasEnteras) * 60);

    return `${horasEnteras} h ${minutos.toString().padStart(2, "0")} min`;
  };

  const nombreMes = mesActual.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

return (
  <View style={styles.container}>

<View style={{ paddingTop: insets.top + 12 }}>
      <View style={styles.monthSelector}>
        <Pressable
          style={styles.monthButton}
          onPress={() => cambiarMes(-1)}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color="#111827"
          />
        </Pressable>

        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>MES</Text>
          <Text style={styles.monthTitle}>
            {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
          </Text>
        </View>

        <Pressable
          style={styles.monthButton}
          onPress={() => cambiarMes(1)}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#111827"
          />
        </Pressable>
      </View>
    </View>

    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refrescar}
        />
      }
    >
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color="#B91C1C"
          />
          <Text style={styles.error}>{error}</Text>
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
            <Ionicons
              name="calendar-outline"
              size={30}
              color="#6B7280"
            />
          </View>

          <Text style={styles.emptyTitle}>
            No hay fichajes este mes
          </Text>

          <Text style={styles.emptyText}>
            Cuando realices fichajes aparecerán aquí.
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
                  {formatearDia(`${dia.fecha}T12:00:00`)}
                </Text>

                <Text style={styles.dayHours}>
                  {dia.horas > 0
                    ? formatearHoras(dia.horas)
                    : "Jornada incompleta"}
                </Text>
              </View>

              {dia.incompleto ? (
                <View style={styles.warningBadge}>
                  <Ionicons
                    name="warning-outline"
                    size={15}
                    color="#92400E"
                  />

                  <Text style={styles.warningText}>
                    Incompleto
                  </Text>
                </View>
              ) : (
                <View style={styles.completeBadge}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color="#166534"
                  />
                </View>
              )}
            </View>

            <View style={styles.timeline}>
              {dia.fichajes.map((fichaje, index) => (
                <View
                  key={fichaje.id}
                  style={styles.timelineItem}
                >
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        fichaje.tipo === "ENTRADA"
                          ? styles.entryDot
                          : styles.exitDot,
                      ]}
                    />

                    {index < dia.fichajes.length - 1 ? (
                      <View style={styles.timelineLine} />
                    ) : null}
                  </View>

                  <View style={styles.timelineContent}>
                    <View>
                      <Text style={styles.fichajeType}>
                        {fichaje.tipo === "ENTRADA"
                          ? "Entrada"
                          : "Salida"}
                      </Text>

                      <Text style={styles.fichajeOrigin}>
                        {fichaje.origen}
                      </Text>
                    </View>

                    <Text style={styles.fichajeTime}>
                      {formatearHora(fichaje.fecha_hora)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>

  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 18,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FB",
  },

  header: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },


  title: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
  },

  monthSelector: {
    height: 76,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 14,
  },

  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  monthCenter: {
    alignItems: "center",
  },

  monthLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#9CA3AF",
    marginBottom: 2,
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  error: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
  },

  summary: {
    backgroundColor: "#111827",
    borderRadius: 18,
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 24,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 5,
  },

  summaryLabel: {
    color: "#D1D5DB",
    fontSize: 10,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#374151",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },

  dayHours: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  completeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },

  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  warningText: {
    color: "#92400E",
    fontSize: 10,
    fontWeight: "600",
  },

  timeline: {
    paddingTop: 14,
  },

  timelineItem: {
    flexDirection: "row",
    minHeight: 54,
  },

  timelineLeft: {
    width: 28,
    alignItems: "center",
  },

  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  entryDot: {
    backgroundColor: "#16A34A",
  },

  exitDot: {
    backgroundColor: "#DC2626",
  },

  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 3,
  },

  timelineContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
  },

  fichajeType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  fichajeOrigin: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  fichajeTime: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    marginTop: 4,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },

  bottomSpace: {
    height: 30,
  },
});