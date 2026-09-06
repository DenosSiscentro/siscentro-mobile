 import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface Recordatorio {
  id: string;
  nombre: string;
  hora: number;
  minuto: number;
  dias: number[];
  activo: boolean;
  notificationIds: string[];
}

const KEY = "siscentro_recordatorios";
const CHANNEL_ID = "siscentro-recordatorios";

/**
 * Configura el canal de notificaciones en Android
 * y solicita permiso al usuario.
 */
export async function configurarNotificaciones() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Recordatorios de fichaje",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    if (!requested.granted) {
      throw new Error("NOTIFICATIONS_PERMISSION_DENIED");
    }
  }
}

/**
 * Carga todos los recordatorios guardados en el dispositivo.
 */
async function cargar(): Promise<Recordatorio[]> {
  const data = await SecureStore.getItemAsync(KEY);

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
 * Guarda todos los recordatorios en SecureStore.
 */
async function guardar(recordatorios: Recordatorio[]) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(recordatorios));
}

/**
 * Genera un identificador único para cada recordatorio.
 */
function crearId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Programa las notificaciones correspondientes a un recordatorio.
 *
 * Se crea una notificación independiente para cada día seleccionado.
 */

async function programar(
  recordatorio: Omit<Recordatorio, "notificationIds">
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
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
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
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
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
 * Obtiene todos los recordatorios.
 */
export async function getRecordatorios(): Promise<Recordatorio[]> {
  return cargar();
}

/**
 * Crea un nuevo recordatorio y programa sus notificaciones.
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
    nombre: nombre.trim() || "Recordatorio de fichaje",
    hora,
    minuto,
    dias,
    activo: true,
  };

  const notificationIds = await programar(recordatorioBase);

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
 * Elimina completamente un recordatorio.
 */
export async function eliminarRecordatorio(id: string) {
  const recordatorios = await cargar();

  const recordatorio = recordatorios.find(
    (item) => item.id === id
  );

  if (recordatorio) {
    for (const notificationId of recordatorio.notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId
      );
    }
  }

  await guardar(
    recordatorios.filter((item) => item.id !== id)
  );
}

/**
 * Activa o desactiva un recordatorio.
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

  // Primero cancelamos las notificaciones actuales.
  for (const notificationId of recordatorio.notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId
    );
  }

  // Si se activa, volvemos a programarlas.
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
 * Cancela todas las notificaciones programadas
 * de todos los recordatorios.
 */
export async function cancelarTodosLosRecordatorios() {
  const recordatorios = await cargar();

  for (const recordatorio of recordatorios) {
    for (const notificationId of recordatorio.notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId
      );
    }
  }
}
