// Modelo de un usuario para el login (tabla `usuario`)
// NOTA: el password va en texto plano solo por ser proyecto académico.
// Mejora futura: en producción debe almacenarse cifrado (hash + salt).
export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  password: string;
}
