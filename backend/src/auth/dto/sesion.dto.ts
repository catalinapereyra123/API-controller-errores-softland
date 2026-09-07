/** Usuario tal como lo consume el front (sin passwordHash). */
export interface UsuarioDto {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  avatarIniciales: string;
}

/** Respuesta de /auth/registro y /auth/login. */
export interface SesionDto {
  token: string;
  /** Segundos de vida del token, para que el front sepa cuándo re-loguear. */
  expiraEn: number;
  usuario: UsuarioDto;
}

/** Lo que el guard deja en `request.usuario` a partir del JWT. */
export interface UsuarioAutenticado {
  id: string;
  email: string;
  nombre: string;
}
