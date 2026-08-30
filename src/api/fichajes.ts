import { getToken } from "../storage/auth";

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
  const token = await getToken();

  if (!token) {
    throw new Error("No hay sesión");
  }

  const response = await fetch(
    `${API_URL}/fichajes?page=1&page_size=1`,
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

  return data.items.length > 0 ? data.items[0] : null;
}

export async function crearFichaje(
  tipo: "ENTRADA" | "SALIDA"
): Promise<Fichaje> {
  const token = await getToken();

  if (!token) {
    throw new Error("No hay sesión");
  }

  const response = await fetch(`${API_URL}/fichajes/movil`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tipo,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}
