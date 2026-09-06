import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  cambiarEstadoRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  getRecordatorios,
  Recordatorio,
} from "../src/storage/recordatorios";

const DIAS = [
  { numero: 2, nombre: "L" },
  { numero: 3, nombre: "M" },
  { numero: 4, nombre: "X" },
  { numero: 5, nombre: "J" },
  { numero: 6, nombre: "V" },
  { numero: 7, nombre: "S" },
  { numero: 1, nombre: "D" },
];

export default function RecordatoriosScreen() {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [nombre, setNombre] = useState("");
  const [hora, setHora] = useState(new Date());
  const [dias, setDias] = useState<number[]>([2, 3, 4, 5, 6]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarRecordatorios();
  }, []);

  async function cargarRecordatorios() {
    try {
      const datos = await getRecordatorios();
      setRecordatorios(datos);
    } catch (error) {
      console.error("Error cargando recordatorios:", error);
    }
  }

  function abrirNuevoRecordatorio() {
    setNombre("");
    setHora(new Date());
    setDias([2, 3, 4, 5, 6]);
    setModalVisible(true);
  }

  function alternarDia(numero: number) {
    setDias((actuales) => {
      if (actuales.includes(numero)) {
        return actuales.filter((dia) => dia !== numero);
      }

      return [...actuales, numero];
    });
  }

  async function guardarNuevoRecordatorio() {
    if (!nombre.trim()) {
      Alert.alert(
        "Falta el nombre",
        "Introduce un nombre para el recordatorio."
      );
      return;
    }

    if (dias.length === 0) {
      Alert.alert(
        "Faltan días",
        "Selecciona al menos un día de la semana."
      );
      return;
    }

    try {
      setGuardando(true);

      await crearRecordatorio(
        nombre,
        hora.getHours(),
        hora.getMinutes(),
        dias
      );

      setModalVisible(false);

      await cargarRecordatorios();
    } catch (error) {
      console.error("Error creando recordatorio:", error);

      if (
        error instanceof Error &&
        error.message === "NOTIFICATIONS_PERMISSION_DENIED"
      ) {
        Alert.alert(
          "Notificaciones desactivadas",
          "Necesitas permitir las notificaciones para utilizar los recordatorios de Siscentro."
        );
      } else {
        Alert.alert(
          "Error",
          "No se ha podido crear el recordatorio."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(
    recordatorio: Recordatorio,
    activo: boolean
  ) {
    try {
      await cambiarEstadoRecordatorio(
        recordatorio.id,
        activo
      );

      await cargarRecordatorios();
    } catch (error) {
      console.error(
        "Error cambiando estado del recordatorio:",
        error
      );

      Alert.alert(
        "Error",
        "No se ha podido modificar el recordatorio."
      );
    }
  }

  function confirmarEliminacion(recordatorio: Recordatorio) {
    Alert.alert(
      "Eliminar recordatorio",
      `¿Quieres eliminar "${recordatorio.nombre}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await eliminarRecordatorio(recordatorio.id);
              await cargarRecordatorios();
            } catch (error) {
              console.error(
                "Error eliminando recordatorio:",
                error
              );

              Alert.alert(
                "Error",
                "No se ha podido eliminar el recordatorio."
              );
            }
          },
        },
      ]
    );
  }

  function formatearHora(
    hora: number,
    minuto: number
  ) {
    return `${hora.toString().padStart(2, "0")}:${minuto
      .toString()
      .padStart(2, "0")}`;
  }

  function mostrarDias(recordatorio: Recordatorio) {
    return DIAS.filter((dia) =>
      recordatorio.dias.includes(dia.numero)
    )
      .map((dia) => dia.nombre)
      .join(" ");
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Mis recordatorios</Text>
          <Text style={styles.subtitle}>
            Recibe avisos para no olvidarte de fichar
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {recordatorios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>

            <Text style={styles.emptyTitle}>
              No tienes recordatorios
            </Text>

            <Text style={styles.emptyText}>
              Crea uno para recibir un aviso antes de fichar.
            </Text>
          </View>
        ) : (
          recordatorios.map((recordatorio) => (
            <View
              key={recordatorio.id}
              style={[
                styles.card,
                !recordatorio.activo &&
                  styles.cardDisabled,
              ]}
            >
              <View style={styles.cardMain}>
                <View style={styles.timeContainer}>
                  <Text style={styles.time}>
                    {formatearHora(
                      recordatorio.hora,
                      recordatorio.minuto
                    )}
                  </Text>

                  <Text style={styles.days}>
                    {mostrarDias(recordatorio)}
                  </Text>
                </View>

                <View style={styles.info}>
                  <Text
                    style={[
                      styles.recordatorioNombre,
                      !recordatorio.activo &&
                        styles.textDisabled,
                    ]}
                  >
                    {recordatorio.nombre}
                  </Text>

                  <Text
                    style={[
                      styles.status,
                      !recordatorio.activo &&
                        styles.textDisabled,
                    ]}
                  >
                    {recordatorio.activo
                      ? "Activo"
                      : "Desactivado"}
                  </Text>
                </View>

                <Switch
                  value={recordatorio.activo}
                  onValueChange={(valor) =>
                    cambiarEstado(recordatorio, valor)
                  }
                />
              </View>

              <View style={styles.cardFooter}>
                <Pressable
                  onPress={() =>
                    confirmarEliminacion(recordatorio)
                  }
                >
                  <Text style={styles.deleteText}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={abrirNuevoRecordatorio}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>
            Nuevo recordatorio
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Nuevo recordatorio
              </Text>

              <Pressable
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Nombre</Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. Entrada"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="sentences"
              maxLength={50}
            />

            <Text style={styles.label}>Hora</Text>

            <View style={styles.timePickerContainer}>
              <DateTimePicker
                value={hora}
                mode="time"
                display="spinner"
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setHora(selectedDate);
                  }
                }}
              />
            </View>

            <Text style={styles.label}>
              Días de la semana
            </Text>

            <View style={styles.daysSelector}>
              {DIAS.map((dia) => {
                const seleccionado = dias.includes(
                  dia.numero
                );

                return (
                  <Pressable
                    key={dia.numero}
                    style={[
                      styles.dayButton,
                      seleccionado &&
                        styles.dayButtonSelected,
                    ]}
                    onPress={() =>
                      alternarDia(dia.numero)
                    }
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        seleccionado &&
                          styles.dayButtonTextSelected,
                      ]}
                    >
                      {dia.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.saveButton,
                guardando && styles.saveButtonDisabled,
              ]}
              onPress={guardarNuevoRecordatorio}
              disabled={guardando}
            >
              <Text style={styles.saveButtonText}>
                {guardando
                  ? "Guardando..."
                  : "Guardar recordatorio"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
              disabled={guardando}
            >
              <Text style={styles.cancelButtonText}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  backIcon: {
    fontSize: 36,
    lineHeight: 38,
    color: "#1f2937",
  },

  headerTitleContainer: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#6b7280",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  cardDisabled: {
    opacity: 0.65,
  },

  cardMain: {
    flexDirection: "row",
    alignItems: "center",
  },

  timeContainer: {
    width: 80,
  },

  time: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  days: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
    letterSpacing: 1,
  },

  info: {
    flex: 1,
    marginHorizontal: 12,
  },

  recordatorioNombre: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  status: {
    marginTop: 3,
    fontSize: 12,
    color: "#16a34a",
  },

  textDisabled: {
    color: "#9ca3af",
  },

  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "flex-end",
  },

  deleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#dc2626",
  },

  addButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonPressed: {
    opacity: 0.8,
  },

  addIcon: {
    fontSize: 26,
    color: "#ffffff",
    marginRight: 8,
    marginTop: -2,
  },

  addText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  closeButton: {
    fontSize: 32,
    lineHeight: 32,
    color: "#6b7280",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 18,
  },

  timePickerContainer: {
    alignItems: "center",
    marginBottom: 18,
  },

  daysSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },

  dayButtonSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  dayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },

  dayButtonTextSelected: {
    color: "#ffffff",
  },

  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  cancelButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
});
