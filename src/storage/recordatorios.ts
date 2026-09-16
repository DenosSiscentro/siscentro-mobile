import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { authenticatedFetch } from "../api/client";
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
 * Configura las notificaciones del dispositivo.
 *
 * Aunque los recordatorios ya no se programan localmente,
 * mantenemos esta función porque las notificaciones push
 * siguen utilizándose en la aplicación.
 */
export async function configurarNotificaciones() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      CHANNEL_ID,
      {
        name: "Recordatorios de fichaje",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
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
 *
 * Se mantiene para conservar la estructura existente y
 * comprobar que existe una sesión válida antes de operar.
 */
async function obtenerUsuarioId(): Promise<number> {
  const usuario = await getUser();

  if (!usuario) {
    throw new Error("NO_USER_SESSION");
  }

  return usuario.id;
}

/**
 * Convierte la respuesta del servidor al formato que
 * actualmente utiliza la interfaz móvil.
 */
function convertirDesdeApi(
  recordatorio: {
    id: number;
    titulo: string;
    mensaje: string;
    hora: number;
    minuto: number;
    dias_semana: string;
    activo: boolean;
  }
): Recordatorio {
  const dias = recordatorio.dias_semana
    .split(",")
    .map((dia) => Number(dia.trim()))
    .filter((dia) => Number.isInteger(dia));

  return {
    id: String(recordatorio.id),
    nombre: recordatorio.titulo,
    hora: recordatorio.hora,
    minuto: recordatorio.minuto,
    dias,
    activo: recordatorio.activo,
    notificationIds: [],
  };
}

/**
 * Obtiene todos los recordatorios del trabajador actual
 * desde el servidor.
 */
export async function obtenerRecordatorios(): Promise<
  Recordatorio[]
> {
  await obtenerUsuarioId();

  const response =
    await authenticatedFetch("/recordatorios");

  if (!response.ok) {
    throw new Error(
      `ERROR_OBTENER_RECORDATORIOS_${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(convertirDesdeApi);
}

/**
 * Alias para mantener compatibilidad con código
 * que utilice el nombre getRecordatorios().
 */
export async function getRecordatorios(): Promise<
  Recordatorio[]
> {
  return obtenerRecordatorios();
}

/**
 * Crea un nuevo recordatorio en el servidor.
 *
 * El servidor pasa a ser la fuente oficial de los
 * recordatorios. Ya NO se programa una notificación
 * local en el dispositivo.
 */
export async function crearRecordatorio(
  nombre: string | null | undefined,
  hora: number,
  minuto: number,
  dias: number[]
): Promise<Recordatorio> {
  await obtenerUsuarioId();

  const nombreSeguro =
    typeof nombre === "string" &&
    nombre.trim().length > 0
      ? nombre.trim()
      : "Recordatorio de fichaje";

  const diasUnicos = [
    ...new Set(
      dias.filter(
        (dia) =>
          Number.isInteger(dia) &&
          dia >= 1 &&
          dia <= 7
      )
    ),
  ];

  const response = await authenticatedFetch(
    "/recordatorios",
    {
      method: "POST",
      body: JSON.stringify({
        titulo: nombreSeguro,
        mensaje: nombreSeguro,
        hora,
        minuto,
        dias_semana: diasUnicos.join(","),
        activo: true,
      }),
    }
  );

  if (!response.ok) {
    const texto = await response.text();

    throw new Error(
      `ERROR_CREAR_RECORDATORIO_${response.status}: ${texto}`
    );
  }

  const data = await response.json();

  return convertirDesdeApi(data);
}

/**
 * Elimina un recordatorio del servidor.
 */
export async function eliminarRecordatorio(
  id: string
) {
  await obtenerUsuarioId();

  const response = await authenticatedFetch(
    `/recordatorios/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const texto = await response.text();

    throw new Error(
      `ERROR_ELIMINAR_RECORDATORIO_${response.status}: ${texto}`
    );
  }
}

/**
 * Activa o desactiva un recordatorio en el servidor.
 *
 * El scheduler del backend respetará este estado.
 */
export async function cambiarEstadoRecordatorio(
  id: string,
  activo: boolean
) {
  await obtenerUsuarioId();

  const response = await authenticatedFetch(
    `/recordatorios/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        activo,
      }),
    }
  );

  if (!response.ok) {
    const texto = await response.text();

    throw new Error(
      `ERROR_CAMBIAR_ESTADO_RECORDATORIO_${response.status}: ${texto}`
    );
  }
}

/**
 * Cancela todas las notificaciones locales existentes.
 *
 * Los recordatorios nuevos ya no utilizan notificaciones
 * locales, pero mantenemos esta función por compatibilidad
 * con el resto de la aplicación.
 */
export async function cancelarTodosLosRecordatorios() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
