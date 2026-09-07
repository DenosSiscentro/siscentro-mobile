import { authenticatedFetch } from "./client";

const API_URL = "https://ncontrol.siscentro.com/api/v1";

export interface Fichaje {
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

export async function getUltimoFichaje(): Promise<Fichaje | null> {
  const response = await authenticatedFetch(
    "/fichajes?page=1&page_size=1"
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: FichajesResponse = await response.json();

  return data.items.length > 0 ? data.items[0] : null;
}

export async function crearFichaje(
  tipo: "ENTRADA" | "SALIDA",
  latitud: number | null,
  longitud: number | null
): Promise<Fichaje> {
  const response = await authenticatedFetch(
    "/fichajes/movil",
    {
      method: "POST",
      body: JSON.stringify({
        tipo,
        latitud,
        longitud,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

// ============================================================
// CORRECCIONES DE FICHAJE
//
// Una "corrección" es una solicitud de crear o modificar un
// fichaje que necesita ser aprobada por la otra parte:
//
//   - La crea un TRABAJADOR  -> queda PENDIENTE_ADMINISTRADOR
//   - La crea un ADMIN       -> queda PENDIENTE_TRABAJADOR
//
// Esta app (siscentro-mobile) solo la usan trabajadores, así
// que aquí solo cubrimos ese lado del flujo.
// ============================================================

export type TipoSolicitudCorreccion = "CREAR" | "MODIFICAR";

export type AccionCorreccion = "APROBAR" | "RECHAZAR";

export interface CorreccionFichaje {
  id: number;
  empresa_id: number;
  fichaje_id: number | null;
  trabajador_id: number;
  fecha_hora_propuesta: string | null;
  tipo_propuesto: "ENTRADA" | "SALIDA" | null;
  motivo: string;
  estado: string;
  tipo_solicitud: TipoSolicitudCorreccion;
  origen_solicitud: string;
  solicitado_por: number;
  resuelto_por: number | null;
  created_at: string;
  resolved_at: string | null;
}

// El backend exige "estado" como texto libre, así que en vez de
// comparar contra un valor exacto (p. ej. "APROBADA") que podríamos
// no conocer bien, nos fijamos en si contiene "RECHAZ" o no.
export function esCorreccionPendiente(
  correccion: CorreccionFichaje
): boolean {
  return correccion.estado.startsWith("PENDIENTE");
}

export function esCorreccionRechazada(
  correccion: CorreccionFichaje
): boolean {
  return correccion.estado.includes("RECHAZ");
}

interface CrearCorreccionInput {
  tipoSolicitud: TipoSolicitudCorreccion;
  motivo: string;
  fichajeId?: number;
  fechaHoraPropuesta?: Date;
  tipoPropuesto?: "ENTRADA" | "SALIDA";
}

/**
 * Crea una solicitud de corrección como trabajador.
 *
 * "trabajador_id" es obligatorio en el esquema del backend, pero
 * solo se utiliza cuando quien solicita es administrador; si quien
 * solicita es un trabajador (como aquí), el backend ignora el valor
 * recibido y usa el trabajador asociado al usuario autenticado. Por
 * eso mandamos un valor fijo: nunca se llega a usar en este flujo.
 */
export async function crearCorreccion(
  datos: CrearCorreccionInput
): Promise<CorreccionFichaje> {
  const response = await authenticatedFetch(
    "/fichajes/correcciones",
    {
      method: "POST",
      body: JSON.stringify({
        tipo_solicitud: datos.tipoSolicitud,
        trabajador_id: 0,
        fichaje_id: datos.fichajeId ?? null,
        fecha_hora_propuesta:
          datos.fechaHoraPropuesta?.toISOString() ??
          null,
        tipo_propuesto:
          datos.tipoPropuesto ?? null,
        motivo: datos.motivo,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Solicitudes creadas por el administrador que este trabajador
 * tiene pendientes de aprobar o rechazar.
 */
export async function getMisCorreccionesPendientes(): Promise<
  CorreccionFichaje[]
> {
  const response = await authenticatedFetch(
    "/fichajes/correcciones/mis-pendientes"
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export async function resolverCorreccion(
  correccionId: number,
  accion: AccionCorreccion
): Promise<CorreccionFichaje> {
  const response = await authenticatedFetch(
    `/fichajes/correcciones/${correccionId}/resolver`,
    {
      method: "POST",
      body: JSON.stringify({ accion }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}