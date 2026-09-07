import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getUser } from "./auth";

export interface Recordatorio {
  id: string;
  nombre: string;
  hora: number;
  minuto: number;
  dias: number[];
  activo: boolean;
  notificationIds: string[];
}

const CHANNEL_ID = "siscentro-recordatorios";

/**
 * Cada trabajador tiene sus propios recordatorios.
 */
function obtenerStorageKey(usuarioId: number) {
  return `siscentro_recordatorios_${usuarioId}`;
}

/**
 * Configura las notificaciones del dispositivo.
 */
export async function configurarNotificaciones() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      CHANNEL_ID,
      {
        name: "Recordatorios de fichaje",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        // No fijamos "sound" aquí. Omitir la propiedad (en vez de pasar
        // el string "default") es la forma correcta de pedir el sonido
        // de notificación por defecto del sistema: así lo documentan los
        // propios ejemplos de Expo. Pasar "default" explícitamente
        // dispara el mismo bug que en content.sound (ver más abajo).
      }
    );
  }

  const permissions =
    await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    const requested =
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
      });

    if (!requested.granted) {
      throw new Error(
        "NOTIFICATIONS_PERMISSION_DENIED"
      );
    }
  }
}

/**
 * Obtiene el ID del usuario actualmente conectado.
 */
async function obtenerUsuarioId(): Promise<number> {
  const usuario = await getUser();

  if (!usuario) {
    throw new Error("NO_USER_SESSION");
  }

  return usuario.id;
}

/**
 * Carga los recordatorios del trabajador actual.
 */
async function cargar(): Promise<Recordatorio[]> {
  const usuarioId = await obtenerUsuarioId();

  const key = obtenerStorageKey(usuarioId);

  const data =
    await SecureStore.getItemAsync(key);

  if (!data) {
    return [];
  }

  try {
    const datos = JSON.parse(data);

    if (!Array.isArray(datos)) {
      return [];
    }

    return datos as Recordatorio[];
  } catch {
    return [];
  }
}

/**
 * Guarda los recordatorios del trabajador actual.
 */
async function guardar(
  recordatorios: Recordatorio[]
) {
  const usuarioId = await obtenerUsuarioId();

  const key = obtenerStorageKey(usuarioId);

  await SecureStore.setItemAsync(
    key,
    JSON.stringify(recordatorios)
  );
}

/**
 * Genera un ID único.
 */
function crearId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/**
 * Programa las notificaciones semanales.
 */
async function programar(
  recordatorio: Omit<
    Recordatorio,
    "notificationIds"
  >
) {
  const notificationIds: string[] = [];

  for (const dia of recordatorio.dias) {
    const notificationId =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Recordatorio Siscentro",
          body: recordatorio.nombre,
          // No fijamos "sound" aquí: en Android lo aporta el canal
          // (CHANNEL_ID, configurado en configurarNotificaciones), y en
          // iOS el sonido por defecto ya lo decide setNotificationHandler
          // (shouldPlaySound). Pasar sound:"default" en el contenido de
          // cada notificación individual dispara un bug conocido de
          // expo-notifications (github.com/expo/expo/issues/40954) que
          // registra el aviso "Custom sound 'default' not found..."
          // aunque el sonido por defecto sí llega a sonar igualmente.
          data: {
            tipo: "recordatorio_fichaje",
            recordatorioId: recordatorio.id,
          },
        },

        trigger:
          Platform.OS === "android"
            ? {
                type:
                  Notifications
                    .SchedulableTriggerInputTypes
                    .WEEKLY,

                weekday: dia,
                hour: recordatorio.hora,
                minute: recordatorio.minuto,

                channelId: CHANNEL_ID,
              }
            : {
                type:
                  Notifications
                    .SchedulableTriggerInputTypes
                    .CALENDAR,

                weekday: dia,
                hour: recordatorio.hora,
                minute: recordatorio.minuto,
              },
      });

    notificationIds.push(notificationId);
  }

  return notificationIds;
}

/**
 * Devuelve todos los recordatorios.
 *
 * Se mantiene este nombre porque es el que utiliza
 * la pantalla recordatorios.tsx.
 */
export async function obtenerRecordatorios(): Promise<
  Recordatorio[]
> {
  return cargar();
}

/**
 * Alias para mantener compatibilidad con código
 * que utilice el nombre getRecordatorios().
 */
export async function getRecordatorios(): Promise<
  Recordatorio[]
> {
  return cargar();
}

/**
 * Crea un nuevo recordatorio.
 */
export async function crearRecordatorio(
  nombre: string | null | undefined,
  hora: number,
  minuto: number,
  dias: number[]
) {
  await configurarNotificaciones();

  /*
   * Protegemos el nombre.
   *
   * Así nunca hacemos:
   *
   * undefined.trim()
   *
   * ni:
   *
   * null.trim()
   */
  const nombreSeguro =
    typeof nombre === "string" &&
    nombre.trim().length > 0
      ? nombre.trim()
      : "Recordatorio de fichaje";

  const recordatorioBase = {
    id: crearId(),

    nombre: nombreSeguro,

    hora,
    minuto,

    dias: [...dias],

    activo: true,
  };

  const notificationIds =
    await programar(recordatorioBase);

  const recordatorio: Recordatorio = {
    ...recordatorioBase,
    notificationIds,
  };

  const recordatorios = await cargar();

  recordatorios.push(recordatorio);

  await guardar(recordatorios);

  return recordatorio;
}

/**
 * Elimina un recordatorio y sus notificaciones.
 */
export async function eliminarRecordatorio(
  id: string
) {
  const recordatorios = await cargar();

  const recordatorio =
    recordatorios.find(
      (item) => item.id === id
    );

  if (recordatorio) {
    for (const notificationId of
      recordatorio.notificationIds ?? []) {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId
      );
    }
  }

  const nuevosRecordatorios =
    recordatorios.filter(
      (item) => item.id !== id
    );

  await guardar(nuevosRecordatorios);
}

/**
 * Activa o desactiva un recordatorio.
 */
export async function cambiarEstadoRecordatorio(
  id: string,
  activo: boolean
) {
  const recordatorios = await cargar();

  const recordatorio =
    recordatorios.find(
      (item) => item.id === id
    );

  if (!recordatorio) {
    return;
  }

  /*
   * Cancelamos las notificaciones anteriores.
   */
  for (const notificationId of
    recordatorio.notificationIds ?? []) {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId
    );
  }

  /*
   * Si se activa, las volvemos a programar.
   */
  if (activo) {
    recordatorio.notificationIds =
      await programar(recordatorio);
  } else {
    recordatorio.notificationIds = [];
  }

  recordatorio.activo = activo;

  await guardar(recordatorios);
}

/**
 * Cancela todas las notificaciones existentes.
 *
 * No elimina los recordatorios.
 */
export async function cancelarTodosLosRecordatorios() {
  const recordatorios = await cargar();

  for (const recordatorio of recordatorios) {
    for (const notificationId of
      recordatorio.notificationIds ?? []) {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId
      );
    }
  }
}