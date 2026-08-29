export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellidos: string | null;
  empresa_id: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: Usuario;
}
