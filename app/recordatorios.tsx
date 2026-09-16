import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  obtenerRecordatorios,
  Recordatorio,
} from "../src/storage/recordatorios";
import { colors } from "../src/theme";

const DIAS = [
  { numero: 2, nombre: "L", nombreCompleto: "Lunes" },
  { numero: 3, nombre: "M", nombreCompleto: "Martes" },
  { numero: 4, nombre: "X", nombreCompleto: "Miércoles" },
  { numero: 5, nombre: "J", nombreCompleto: "Jueves" },
  { numero: 6, nombre: "V", nombreCompleto: "Viernes" },
  { numero: 7, nombre: "S", nombreCompleto: "Sábado" },
  { numero: 1, nombre: "D", nombreCompleto: "Domingo" },
];

export default function RecordatoriosScreen() {
  const [recordatorios, setRecordatorios] =
    useState<Recordatorio[]>([]);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [nombre, setNombre] =
    useState("");

  const [hora, setHora] =
    useState(new Date());

  const [mostrarPicker, setMostrarPicker] =
    useState(false);

  const [dias, setDias] =
    useState<number[]>([2, 3, 4, 5, 6]);

  const [guardando, setGuardando] =
    useState(false);

  useEffect(() => {
    cargarRecordatorios();
  }, []);

  async function cargarRecordatorios() {
    try {
      const datos =
        await obtenerRecordatorios();

      setRecordatorios(datos);
    } catch (error) {
      console.error(
        "Error cargando recordatorios:",
        error
      );
    }
  }

  function abrirNuevoRecordatorio() {
    setNombre("");
    setHora(new Date());
    setDias([2, 3, 4, 5, 6]);
    setMostrarPicker(false);
    setModalVisible(true);
  }

  function alternarDia(numero: number) {
    setDias((actuales) => {
      if (actuales.includes(numero)) {
        return actuales.filter(
          (dia) => dia !== numero
        );
      }

      return [...actuales, numero];
    });
  }

  function manejarSeleccionHora(
    _evento: unknown,
    fechaSeleccionada?: Date
  ) {
    if (!fechaSeleccionada) {
      return;
    }

    setHora(fechaSeleccionada);

    if (Platform.OS === "android") {
      setMostrarPicker(false);
    }
  }

  function manejarCierrePicker() {
    // El usuario canceló el diálogo (Android): no tocamos "hora".
    setMostrarPicker(false);
  }

  async function guardarNuevoRecordatorio() {
    const nombreSeguro =
      typeof nombre === "string"
        ? nombre.trim()
        : "";

    if (!nombreSeguro) {
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
        nombreSeguro,
        hora.getHours(),
        hora.getMinutes(),
        dias
      );

      setModalVisible(false);

      await cargarRecordatorios();
    } catch (error) {
      console.error(
        "Error creando recordatorio:",
        error
      );

      if (
        error instanceof Error &&
        error.message ===
          "NOTIFICATIONS_PERMISSION_DENIED"
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

  function confirmarEliminacion(
    recordatorio: Recordatorio
  ) {
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
              await eliminarRecordatorio(
                recordatorio.id
              );

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
    return `${hora
      .toString()
      .padStart(2, "0")}:${minuto
      .toString()
      .padStart(2, "0")}`;
  }

  function mostrarDias(
    recordatorio: Recordatorio
  ) {
    return DIAS.filter((dia) =>
      recordatorio.dias.includes(
        dia.numero
      )
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

        <View
          style={styles.headerTitleContainer}
        >
          <Text style={styles.title}>
            Mis recordatorios
          </Text>

          <Text style={styles.subtitle}>
            Avisos para no olvidarte de fichar
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        {recordatorios.length === 0 ? (
          <View
            style={styles.emptyContainer}
          >
            <View style={styles.emptyIconRing}>
              <Feather
                name="bell-off"
                size={22}
                color={colors.inkFaint}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No tienes recordatorios
            </Text>

            <Text
              style={styles.emptyText}
            >
              Crea uno para recibir un aviso antes
              de fichar.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            <View style={styles.listHeaderRow}>
              <Text
                style={[
                  styles.listHeaderText,
                  { width: 64 },
                ]}
              >
                Hora
              </Text>
              <Text
                style={[
                  styles.listHeaderText,
                  { flex: 1, marginHorizontal: 14 },
                ]}
              >
                Recordatorio
              </Text>
            </View>

            {recordatorios.map(
              (recordatorio, index) => (
                <View
                  key={recordatorio.id}
                  style={[
                    styles.row,
                    index !==
                      recordatorios.length - 1 &&
                      styles.rowDivider,
                    !recordatorio.activo &&
                      styles.rowDisabled,
                  ]}
                >
                  <View
                    style={styles.timeContainer}
                  >
                    <Text
                      style={[
                        styles.time,
                        !recordatorio.activo &&
                          styles.textFaint,
                      ]}
                    >
                      {formatearHora(
                        recordatorio.hora,
                        recordatorio.minuto
                      )}
                    </Text>

                    <Text
                      style={styles.days}
                    >
                      {mostrarDias(
                        recordatorio
                      )}
                    </Text>
                  </View>

                  <View
                    style={styles.info}
                  >
                    <Text
                      style={[
                        styles.recordatorioNombre,
                        !recordatorio.activo &&
                          styles.textFaint,
                      ]}
                      numberOfLines={1}
                    >
                      {recordatorio.nombre}
                    </Text>

                    <View
                      style={styles.statusRow}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          recordatorio.activo
                            ? styles.statusDotActive
                            : styles.statusDotInactive,
                        ]}
                      />
                      <Text
                        style={styles.statusText}
                      >
                        {recordatorio.activo
                          ? "Activo"
                          : "Desactivado"}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={recordatorio.activo}
                    onValueChange={(valor) =>
                      cambiarEstado(
                        recordatorio,
                        valor
                      )
                    }
                    trackColor={{
                      false: colors.border,
                      true: colors.accent,
                    }}
                    thumbColor={colors.surface}
                    ios_backgroundColor={
                      colors.border
                    }
                  />

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      confirmarEliminacion(
                        recordatorio
                      )
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar recordatorio ${recordatorio.nombre}`}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={colors.inkFaint}
                    />
                  </Pressable>
                </View>
              )
            )}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed &&
              styles.addButtonPressed,
          ]}
          onPress={
            abrirNuevoRecordatorio
          }
        >
          <Feather
            name="plus"
            size={18}
            color={colors.surface}
          />

          <Text style={styles.addText}>
            Nuevo recordatorio
          </Text>
        </Pressable>
                          <Pressable
  style={styles.diagnosticButton}
  onPress={() =>
    router.push("/diagnostico-notificaciones")
  }
>
  <Feather
    name="activity"
    size={17}
    color={colors.ink}
  />

  <Text style={styles.diagnosticText}>
    Diagnóstico de notificaciones
  </Text>
</Pressable>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : "height"
          }
        >
          <View
            style={styles.modalContainer}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              <View style={styles.modalHandle} />

              <View
                style={styles.modalHeader}
            >
              <Text
                style={styles.modalTitle}
              >
                Nuevo recordatorio
              </Text>

              <Pressable
                onPress={() =>
                  setModalVisible(false)
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Feather
                  name="x"
                  size={22}
                  color={colors.inkMuted}
                />
              </Pressable>
            </View>

            <Text style={styles.label}>
              Nombre
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. Entrada"
              placeholderTextColor={
                colors.inkFaint
              }
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="sentences"
              maxLength={50}
            />

            <Text style={styles.label}>
              Hora
            </Text>

            {Platform.OS === "android" ? (
              <Pressable
                style={styles.timeButton}
                onPress={() =>
                  setMostrarPicker(true)
                }
              >
                <Feather
                  name="clock"
                  size={16}
                  color={colors.inkMuted}
                />
                <Text
                  style={styles.timeButtonText}
                >
                  {formatearHora(
                    hora.getHours(),
                    hora.getMinutes()
                  )}
                </Text>
              </Pressable>
            ) : (
              <View
                style={
                  styles.timePickerContainer
                }
              >
                <DateTimePicker
                  value={hora}
                  mode="time"
                  display="spinner"
                  onValueChange={
                    manejarSeleccionHora
                  }
                />
              </View>
            )}

            {Platform.OS === "android" &&
              mostrarPicker && (
                <DateTimePicker
                  value={hora}
                  mode="time"
                  display="default"
                  onValueChange={
                    manejarSeleccionHora
                  }
                  onDismiss={
                    manejarCierrePicker
                  }
                />
              )}

            <Text style={styles.label}>
              Días de la semana
            </Text>

            <View
              style={styles.daysSelector}
            >
              {DIAS.map((dia) => {
                const seleccionado =
                  dias.includes(
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
                      alternarDia(
                        dia.numero
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      dia.nombreCompleto
                    }
                    accessibilityState={{
                      selected: seleccionado,
                    }}
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
                guardando &&
                  styles.saveButtonDisabled,
              ]}
              onPress={
                guardarNuevoRecordatorio
              }
              disabled={guardando}
            >
              <Text
                style={
                  styles.saveButtonText
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar recordatorio"}
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.cancelButton
              }
              onPress={() =>
                setModalVisible(false)
              }
              disabled={guardando}
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancelar
              </Text>
            </Pressable>
            </ScrollView>

          </View>
        </KeyboardAvoidingView>
        
      </Modal>

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
    paddingVertical: 64,
    paddingHorizontal: 30,
  },

  emptyIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
    textAlign: "center",
  },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  listHeaderRow: {
    flexDirection: "row",
    paddingTop: 14,
    paddingBottom: 10,
  },

  listHeaderText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.inkFaint,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  rowDisabled: {
    opacity: 0.55,
  },

  timeContainer: {
    width: 64,
  },

  time: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: -0.2,
  },

  days: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkFaint,
    letterSpacing: 0.4,
  },

  info: {
    flex: 1,
    marginHorizontal: 14,
  },

  recordatorioNombre: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  statusDotActive: {
    backgroundColor: colors.accent,
  },

  statusDotInactive: {
    backgroundColor: colors.borderStrong,
  },

  statusText: {
    fontSize: 12,
    color: colors.inkMuted,
  },

  textFaint: {
    color: colors.inkFaint,
  },

  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },

  addButton: {
    marginTop: 20,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  addButtonPressed: {
    opacity: 0.85,
  },

  addText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.surface,
    letterSpacing: 0.1,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },

  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
  },

  modalScrollContent: {
    padding: 24,
    paddingBottom: 34,
  },

  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15.5,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },

  timeButton: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  timeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },

  timePickerContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },

  daysSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 22,
  },

  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  dayButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  dayButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
  },

  dayButtonTextSelected: {
    color: colors.surface,
  },

  saveButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: colors.surface,
    fontSize: 15.5,
    fontWeight: "700",
  },

  cancelButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  cancelButtonText: {
    color: colors.inkMuted,
    fontSize: 14.5,
    fontWeight: "600",
  },

  diagnosticButton: {
  minHeight: 48,
  borderRadius: 11,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  marginTop: 12,
},

diagnosticText: {
  color: colors.ink,
  fontSize: 13,
  fontWeight: "600",
},
});