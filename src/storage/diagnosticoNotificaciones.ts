import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface DiagnosticoNotificaciones {
  plataforma: string;
  permisoNotificaciones: string;
  canalAndroid: string;
  notificacionesProgramadas: number;
  programadas: Array<{
    id: string;
    titulo: string;
    trigger: string;
    proximaEjecucion: string;
  }>;
}

export async function obtenerDiagnosticoNotificaciones(): Promise<DiagnosticoNotificaciones> {
  const permissions =
    await Notifications.getPermissionsAsync();

  let canalAndroid = "No aplica";

  if (Platform.OS === "android") {
    const channel =
      await Notifications.getNotificationChannelAsync(
        "siscentro-recordatorios"
      );

    if (!channel) {
      canalAndroid = "NO EXISTE";
    } else {
      canalAndroid =
        `OK - ${channel.name} - importancia=${channel.importance}`;
    }
  }

  const programadas =
    await Notifications.getAllScheduledNotificationsAsync();

  const detalle = await Promise.all(
    programadas.map(async (notification) => {
      let proximaEjecucion = "No calculable";

      try {
        const trigger =
          notification.trigger as any;

        if (trigger) {
          const timestamp =
            await Notifications.getNextTriggerDateAsync(
              trigger
            );

          if (timestamp) {
            proximaEjecucion =
              new Date(timestamp).toLocaleString(
                "es-ES"
              );
          }
        }
      } catch (error) {
        console.warn(
          "No se pudo calcular el siguiente trigger",
          error
        );
      }

      return {
        id: notification.identifier,
        titulo:
          notification.content.title ??
          "(sin título)",
        trigger: JSON.stringify(
          notification.trigger
        ),
        proximaEjecucion,
      };
    })
  );

  return {
    plataforma:
      `${Platform.OS} ${Platform.Version}`,

    permisoNotificaciones:
      permissions.granted
        ? "CONCEDIDO"
        : permissions.status,

    canalAndroid,

    notificacionesProgramadas:
      programadas.length,

    programadas: detalle,
  };
}

/**
 * Programa una notificación única para dentro
 * de aproximadamente 2 minutos.
 *
 * IMPORTANTE:
 * Usamos DATE y no TIME_INTERVAL porque queremos
 * probar precisamente la ruta de alarmas temporales
 * que nos interesa para los recordatorios.
 */
export async function programarPruebaDosMinutos() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "siscentro-recordatorios",
      {
        name: "Recordatorios de fichaje",
        importance:
          Notifications.AndroidImportance.HIGH,
        vibrationPattern: [
          0,
          250,
          250,
          250,
        ],
      }
    );
  }

  const permissions =
    await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    const requested =
      await Notifications.requestPermissionsAsync();

    if (!requested.granted) {
      throw new Error(
        "NOTIFICATIONS_PERMISSION_DENIED"
      );
    }
  }

  const fecha = new Date(
    Date.now() + 2 * 60 * 1000
  );

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Prueba Siscentro",
        body:
          "Si estás viendo este aviso, las notificaciones programadas funcionan correctamente.",
        data: {
          tipo: "prueba_notificacion",
        },
      },

      trigger:
        Platform.OS === "android"
          ? {
              type:
                Notifications
                  .SchedulableTriggerInputTypes
                  .DATE,
              date: fecha,
              channelId:
                "siscentro-recordatorios",
            }
          : {
              type:
                Notifications
                  .SchedulableTriggerInputTypes
                  .DATE,
              date: fecha,
            },
    });

  return {
    notificationId,
    fecha,
  };
}

/**
 * Cancela una notificación concreta.
 */
export async function cancelarNotificacion(
  notificationId: string
) {
  await Notifications.cancelScheduledNotificationAsync(
    notificationId
  );
}
