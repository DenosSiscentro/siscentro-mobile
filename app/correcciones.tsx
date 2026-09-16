import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AccionCorreccion,
  CorreccionFichaje,
  crearCorreccion,
  getMisCorreccionesPendientes,
  resolverCorreccion,
} from "../src/api/fichajes";
import { colors } from "../src/theme";

function inicioDelDia(fecha: Date) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

export default function CorreccionesScreen() {
  const params = useLocalSearchParams<{
    modo?: string;
    fichajeId?: string;
    tipo?: string;
    fechaHora?: string;
  }>();

  const [pendientes, setPendientes] = useState<
    CorreccionFichaje[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [resolviendoId, setResolviendoId] = useState<
    number | null
  >(null);

  const [modalVisible, setModalVisible] =
    useState(false);

  // "crear": pedir un fichaje nuevo (p. ej. "olvidé fichar").
  // "modificar": corregir hora/tipo de un fichaje ya existente.
  // "anular": pedir que se elimine un fichaje ya existente.
  const [modo, setModo] = useState<
    "crear" | "modificar" | "anular"
  >("crear");

  const [fichajeId, setFichajeId] = useState<
    number | null
  >(null);

  const [tipo, setTipo] = useState<
    "ENTRADA" | "SALIDA"
  >("ENTRADA");

  const [fecha, setFecha] = useState(
    inicioDelDia(new Date())
  );

  const [hora, setHora] = useState(new Date());

  const [motivo, setMotivo] = useState("");

  const [mostrarFechaPicker, setMostrarFechaPicker] =
    useState(false);

  const [mostrarHoraPicker, setMostrarHoraPicker] =
    useState(false);

  const [enviando, setEnviando] = useState(false);

  // Si venimos de "historial" con un fichaje seleccionado (modificar
  // o anular), abrimos el formulario ya relleno con sus datos.
  useEffect(() => {
    if (
      !params.fichajeId ||
      !params.modo ||
      (params.modo !== "modificar" &&
        params.modo !== "anular")
    ) {
      return;
    }

    setModo(params.modo);
    setFichajeId(Number(params.fichajeId));

    if (
      params.tipo === "ENTRADA" ||
      params.tipo === "SALIDA"
    ) {
      setTipo(params.tipo);
    }

    if (params.fechaHora) {
      const fechaOriginal = new Date(
        params.fechaHora
      );

      setFecha(inicioDelDia(fechaOriginal));
      setHora(fechaOriginal);
    }

    setMotivo("");
    setModalVisible(true);
  }, [
    params.fichajeId,
    params.modo,
    params.tipo,
    params.fechaHora,
  ]);

  const cargarPendientes = useCallback(async () => {
    try {
      const datos =
        await getMisCorreccionesPendientes();

      setPendientes(datos);
    } catch (error) {
      console.error(
        "Error cargando correcciones pendientes:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  async function resolver(
    correccion: CorreccionFichaje,
    accion: AccionCorreccion
  ) {
    try {
      setResolviendoId(correccion.id);

      await resolverCorreccion(correccion.id, accion);

      setPendientes((actuales) =>
        actuales.filter(
          (item) => item.id !== correccion.id
        )
      );
    } catch (error) {
      console.error(
        "Error resolviendo corrección:",
        error
      );

      Alert.alert(
        "Error",
        "No se ha podido registrar tu respuesta. Inténtalo de nuevo."
      );
    } finally {
      setResolviendoId(null);
    }
  }

  function confirmarRechazo(
    correccion: CorreccionFichaje
  ) {
    Alert.alert(
      "Rechazar fichaje",
      "¿Seguro que quieres rechazar este fichaje propuesto por tu empresa?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: () =>
            resolver(correccion, "RECHAZAR"),
        },
      ]
    );
  }

  function abrirFormulario() {
    setModo("crear");
    setFichajeId(null);
    setTipo("ENTRADA");
    setFecha(inicioDelDia(new Date()));
    setHora(new Date());
    setMotivo("");
    setModalVisible(true);
  }

  function elegirHoy() {
    setFecha(inicioDelDia(new Date()));
  }

  function elegirAyer() {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    setFecha(inicioDelDia(ayer));
  }

  const esHoy =
    fecha.toDateString() ===
    new Date().toDateString();

  const esAyer = (() => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    return (
      fecha.toDateString() === ayer.toDateString()
    );
  })();

  function manejarSeleccionFecha(
    _evento: unknown,
    fechaSeleccionada?: Date
  ) {
    if (Platform.OS === "android") {
      setMostrarFechaPicker(false);
    }

    if (fechaSeleccionada) {
      setFecha(inicioDelDia(fechaSeleccionada));
    }
  }

  function manejarSeleccionHora(
    _evento: unknown,
    horaSeleccionada?: Date
  ) {
    if (Platform.OS === "android") {
      setMostrarHoraPicker(false);
    }

    if (horaSeleccionada) {
      setHora(horaSeleccionada);
    }
  }

  async function enviarSolicitud() {
    const motivoSeguro = motivo.trim();

    if (!motivoSeguro) {
      Alert.alert(
        "Falta el motivo",
        modo === "anular"
          ? "Cuéntale brevemente a tu empresa por qué hay que anular este fichaje."
          : "Cuéntale brevemente a tu empresa por qué necesitas este fichaje."
      );
      return;
    }

    // Combinamos la fecha elegida con la hora elegida en un único
    // instante: fecha aporta año/mes/día, hora aporta horas/minutos.
    const fechaHoraPropuesta = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
      hora.getHours(),
      hora.getMinutes()
    );

    try {
      setEnviando(true);

      if (modo === "anular") {
        // No proponemos ni tipo ni fecha/hora nuevos: solo pedimos
        // que se elimine el fichaje referenciado por fichajeId.
        await crearCorreccion({
          tipoSolicitud: "ANULAR",
          fichajeId: fichajeId ?? undefined,
          motivo: motivoSeguro,
        });
      } else {
        await crearCorreccion({
          tipoSolicitud:
            modo === "modificar"
              ? "MODIFICAR"
              : "CREAR",
          fichajeId: fichajeId ?? undefined,
          tipoPropuesto: tipo,
          fechaHoraPropuesta,
          motivo: motivoSeguro,
        });
      }

      setModalVisible(false);

      Alert.alert(
        "Solicitud enviada",
        "Tu empresa tiene que aprobarla antes de que aparezca en tu historial."
      );
    } catch (error) {
      console.error(
        "Error creando corrección:",
        error
      );

      Alert.alert(
        "Error",
        "No se ha podido enviar la solicitud. Inténtalo de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  }

  function formatearFechaCorta(fecha: Date) {
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }

  function formatearHoraCorta(fecha: Date) {
    return fecha.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatearFechaHoraPropuesta(
    fechaHora: string | null
  ) {
    if (!fechaHora) {
      return "Sin fecha";
    }

    const valor = new Date(fechaHora);

    return `${formatearFechaCorta(
      valor
    )} · ${formatearHoraCorta(valor)}`;
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
            Correcciones
          </Text>

          <Text style={styles.subtitle}>
            Fichajes pendientes de confirmar o por
            solicitar
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>
          Pendientes de tu confirmación
        </Text>

        {loading ? (
          <ActivityIndicator
            color={colors.accent}
            style={styles.loadingIndicator}
          />
        ) : pendientes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather
              name="check-circle"
              size={20}
              color={colors.inkFaint}
            />
            <Text style={styles.emptyText}>
              No tienes nada pendiente de confirmar
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {pendientes.map((correccion, index) => (
              <View
                key={correccion.id}
                style={[
                  styles.row,
                  index !== pendientes.length - 1 &&
                    styles.rowDivider,
                ]}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTipo}>
                    {correccion.tipo_propuesto ===
                    "ENTRADA"
                      ? "Entrada"
                      : correccion.tipo_propuesto ===
                        "SALIDA"
                      ? "Salida"
                      : correccion.tipo_solicitud ===
                        "CREAR"
                      ? "Nuevo fichaje"
                      : "Modificación"}
                  </Text>

                  <Text style={styles.rowFecha}>
                    {formatearFechaHoraPropuesta(
                      correccion.fecha_hora_propuesta
                    )}
                  </Text>
                </View>

                <Text style={styles.rowMotivo}>
                  {correccion.motivo}
                </Text>

                <View style={styles.rowActions}>
                  <Pressable
                    style={[
                      styles.rowButton,
                      styles.rowButtonReject,
                    ]}
                    onPress={() =>
                      confirmarRechazo(correccion)
                    }
                    disabled={
                      resolviendoId === correccion.id
                    }
                  >
                    <Feather
                      name="x"
                      size={15}
                      color={colors.danger}
                    />
                    <Text
                      style={
                        styles.rowButtonRejectText
                      }
                    >
                      Rechazar
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.rowButton,
                      styles.rowButtonApprove,
                    ]}
                    onPress={() =>
                      resolver(
                        correccion,
                        "APROBAR"
                      )
                    }
                    disabled={
                      resolviendoId === correccion.id
                    }
                  >
                    {resolviendoId ===
                    correccion.id ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.surface}
                      />
                    ) : (
                      <>
                        <Feather
                          name="check"
                          size={15}
                          color={colors.surface}
                        />
                        <Text
                          style={
                            styles.rowButtonApproveText
                          }
                        >
                          Aprobar
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.solicitarButton,
            pressed && styles.solicitarButtonPressed,
          ]}
          onPress={abrirFormulario}
        >
          <Feather
            name="edit-3"
            size={18}
            color={colors.surface}
          />

          <Text style={styles.solicitarText}>
            ¿Olvidaste fichar?
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
          <View style={styles.modalContainer}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modo === "modificar"
                    ? "Modificar fichaje"
                    : modo === "anular"
                    ? "Anular fichaje"
                    : "Solicitar fichaje"}
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

            {modo === "anular" ? (
              <View style={styles.anularResumen}>
                <Feather
                  name="alert-triangle"
                  size={16}
                  color={colors.danger}
                />

                <Text
                  style={styles.anularResumenText}
                >
                  Vas a pedir la anulación de:{" "}
                  <Text
                    style={
                      styles.anularResumenTextStrong
                    }
                  >
                    {tipo === "ENTRADA"
                      ? "Entrada"
                      : "Salida"}
                  </Text>{" "}
                  · {formatearFechaCorta(fecha)} ·{" "}
                  {formatearHoraCorta(hora)}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>
                  Tipo
                </Text>

            <View style={styles.tipoSelector}>
              <Pressable
                style={[
                  styles.tipoButton,
                  tipo === "ENTRADA" &&
                    styles.tipoButtonSelected,
                ]}
                onPress={() => setTipo("ENTRADA")}
              >
                <Text
                  style={[
                    styles.tipoButtonText,
                    tipo === "ENTRADA" &&
                      styles.tipoButtonTextSelected,
                  ]}
                >
                  Entrada
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tipoButton,
                  tipo === "SALIDA" &&
                    styles.tipoButtonSelected,
                ]}
                onPress={() => setTipo("SALIDA")}
              >
                <Text
                  style={[
                    styles.tipoButtonText,
                    tipo === "SALIDA" &&
                      styles.tipoButtonTextSelected,
                  ]}
                >
                  Salida
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Fecha</Text>

            <View style={styles.fechaRow}>
              <Pressable
                style={[
                  styles.chip,
                  esHoy && styles.chipSelected,
                ]}
                onPress={elegirHoy}
              >
                <Text
                  style={[
                    styles.chipText,
                    esHoy && styles.chipTextSelected,
                  ]}
                >
                  Hoy
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.chip,
                  esAyer && styles.chipSelected,
                ]}
                onPress={elegirAyer}
              >
                <Text
                  style={[
                    styles.chipText,
                    esAyer && styles.chipTextSelected,
                  ]}
                >
                  Ayer
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.chip,
                  !esHoy &&
                    !esAyer &&
                    styles.chipSelected,
                ]}
                onPress={() =>
                  setMostrarFechaPicker(true)
                }
              >
                <Feather
                  name="calendar"
                  size={13}
                  color={
                    !esHoy && !esAyer
                      ? colors.surface
                      : colors.inkMuted
                  }
                />
                <Text
                  style={[
                    styles.chipText,
                    !esHoy &&
                      !esAyer &&
                      styles.chipTextSelected,
                  ]}
                >
                  {!esHoy && !esAyer
                    ? formatearFechaCorta(fecha)
                    : "Otra"}
                </Text>
              </Pressable>
            </View>

            {mostrarFechaPicker && (
              <DateTimePicker
                value={fecha}
                mode="date"
                display={
                  Platform.OS === "ios"
                    ? "inline"
                    : "default"
                }
                maximumDate={new Date()}
                onValueChange={
                  manejarSeleccionFecha
                }
              />
            )}

            <Text style={styles.label}>Hora</Text>

            {Platform.OS === "android" ? (
              <Pressable
                style={styles.timeButton}
                onPress={() =>
                  setMostrarHoraPicker(true)
                }
              >
                <Feather
                  name="clock"
                  size={16}
                  color={colors.inkMuted}
                />
                <Text style={styles.timeButtonText}>
                  {formatearHoraCorta(hora)}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.timePickerContainer}>
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
              mostrarHoraPicker && (
                <DateTimePicker
                  value={hora}
                  mode="time"
                  display="default"
                  onValueChange={
                    manejarSeleccionHora
                  }
                />
              )}
              </>
            )}

            <Text style={styles.label}>Motivo</Text>

            <TextInput
              style={styles.motivoInput}
              placeholder="Ej. Se me olvidó fichar la salida"
              placeholderTextColor={colors.inkFaint}
              value={motivo}
              onChangeText={setMotivo}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <Pressable
              style={[
                styles.enviarButton,
                enviando &&
                  styles.enviarButtonDisabled,
              ]}
              onPress={enviarSolicitud}
              disabled={enviando}
            >
              <Text style={styles.enviarButtonText}>
                {enviando
                  ? "Enviando..."
                  : modo === "modificar"
                  ? "Guardar cambios"
                  : modo === "anular"
                  ? "Solicitar anulación"
                  : "Enviar solicitud"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() =>
                setModalVisible(false)
              }
              disabled={enviando}
            >
              <Text style={styles.cancelButtonText}>
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

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    marginBottom: 10,
  },

  loadingIndicator: {
    marginTop: 20,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },

  emptyText: {
    fontSize: 13.5,
    color: colors.inkMuted,
  },

  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  row: {
    paddingVertical: 14,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rowTipo: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },

  rowFecha: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.accent,
  },

  rowMotivo: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 4,
  },

  rowActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  rowButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  rowButtonReject: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },

  rowButtonRejectText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },

  rowButtonApprove: {
    backgroundColor: colors.accent,
  },

  rowButtonApproveText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.surface,
  },

  solicitarButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  solicitarButtonPressed: {
    opacity: 0.85,
  },

  solicitarText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.surface,
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
    marginBottom: 18,
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

  anularResumen: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },

  anularResumenText: {
    flex: 1,
    fontSize: 13.5,
    color: colors.inkMuted,
    lineHeight: 19,
  },

  anularResumenTextStrong: {
    fontWeight: "700",
    color: colors.ink,
  },

  tipoSelector: {
    flexDirection: "row",
    gap: 8,
  },

  tipoButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  tipoButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  tipoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkMuted,
  },

  tipoButtonTextSelected: {
    color: colors.surface,
  },

  fechaRow: {
    flexDirection: "row",
    gap: 8,
  },

  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
  },

  chipTextSelected: {
    color: colors.surface,
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

  motivoInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
    textAlignVertical: "top",
  },

  enviarButton: {
    marginTop: 22,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  enviarButtonDisabled: {
    opacity: 0.6,
  },

  enviarButtonText: {
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
});