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

/*
 * Cada trabajador tendrá sus propios recordatorios.
 *
 * Ejemplo:
 * siscentro_recordatorios_6
 * siscentro_recordatorios_7
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
        sound: "default",
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

  const data = await SecureStore.getItemAsync(key);

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data) as Recordatorio[];
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
 * Genera un ID único para cada recordatorio.
 */
function crearId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/**
 * Programa las notificaciones semanales de un recordatorio.
 */
async function programar(
  recordatorio: Omit<
    Recordatorio,
    "notificationIds"
  >
) {
  const notificationIds: string[] = [];

  for (const dia of recordatorio.dias) {
    let notificationId: string;

    if (Platform.OS === "android") {
      notificationId =
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Recordatorio Siscentro",
            body: recordatorio.nombre,
            sound: "default",
            data: {
              tipo: "recordatorio_fichaje",
              recordatorioId: recordatorio.id,
            },
          },

          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .WEEKLY,

            weekday: dia,
            hour: recordatorio.hora,
            minute: recordatorio.minuto,

            channelId: CHANNEL_ID,
          },
        });
    } else {
      notificationId =
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Recordatorio Siscentro",
            body: recordatorio.nombre,
            sound: "default",
            data: {
              tipo: "recordatorio_fichaje",
              recordatorioId: recordatorio.id,
            },
          },

          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .CALENDAR,

            weekday: dia,
            hour: recordatorio.hora,
            minute: recordatorio.minuto,
          },
        });
    }

    notificationIds.push(notificationId);
  }

  return notificationIds;
}

/**
 * Devuelve todos los recordatorios
 * pertenecientes al trabajador actual.
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
  nombre: string,
  hora: number,
  minuto: number,
  dias: number[]
) {
  await configurarNotificaciones();

  const recordatorioBase = {
    id: crearId(),

    nombre:
      nombre.trim() ||
      "Recordatorio de fichaje",

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
 * Elimina un recordatorio y todas sus
 * notificaciones programadas.
 */
export async function eliminarRecordatorio(
  id: string
) {
  const recordatorios = await cargar();

  const recordatorio = recordatorios.find(
    (item) => item.id === id
  );

  if (recordatorio) {
    for (const notificationId of
      recordatorio.notificationIds) {
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
 *
 * Al desactivarlo:
 * - cancela las notificaciones existentes.
 *
 * Al activarlo:
 * - vuelve a programarlas.
 */
export async function cambiarEstadoRecordatorio(
  id: string,
  activo: boolean
) {
  const recordatorios = await cargar();

  const recordatorio = recordatorios.find(
    (item) => item.id === id
  );

  if (!recordatorio) {
    return;
  }

  /*
   * Primero cancelamos las notificaciones
   * actualmente programadas.
   */
  for (const notificationId of
    recordatorio.notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId
    );
  }

  /*
   * Si se vuelve a activar, programamos
   * nuevamente todas sus notificaciones.
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
 * Cancela todas las notificaciones de los
 * recordatorios del trabajador actual.
 *
 * No elimina los recordatorios almacenados.
 */
export async function cancelarTodosLosRecordatorios() {
  const recordatorios = await cargar();

  for (const recordatorio of recordatorios) {
    for (const notificationId of
      recordatorio.notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId
      );
    }
  }
}