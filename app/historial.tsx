import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { getToken } from "../src/storage/auth";

const API_URL = "http://192.168.10.28:8000/api/v1";

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

export default function HistorialScreen() {
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function formatearHora(fecha: string) {
    return new Date(fecha).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Mis fichajes</Text>

        <View style={{ width: 30 }} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={fichajes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refrescar}
          />
        }
        contentContainerStyle={
          fichajes.length === 0 ? styles.emptyContainer : undefined
        }
        renderItem={({ item, index }) => {
          const fechaActual = formatearFecha(item.fecha_hora);

          const fechaAnterior =
            index > 0
              ? formatearFecha(fichajes[index - 1].fecha_hora)
              : null;

          const mostrarFecha = fechaActual !== fechaAnterior;

          return (
            <View>
              {mostrarFecha && (
                <Text style={styles.date}>{fechaActual}</Text>
              )}

              <View style={styles.item}>
                <View>
                  <Text style={styles.tipo}>{item.tipo}</Text>
                  <Text style={styles.origen}>
                    {item.origen}
                  </Text>
                </View>

                <Text style={styles.hora}>
                  {formatearHora(item.fecha_hora)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Todavía no tienes fichajes.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  back: {
    fontSize: 40,
    fontWeight: "300",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
  },

  date: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
    textTransform: "capitalize",
  },

  item: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tipo: {
    fontSize: 17,
    fontWeight: "600",
  },

  origen: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },

  hora: {
    fontSize: 20,
    fontWeight: "600",
  },

  error: {
    color: "#c00",
    textAlign: "center",
    marginBottom: 10,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },

  empty: {
    textAlign: "center",
    color: "#777",
    fontSize: 16,
  },
});
