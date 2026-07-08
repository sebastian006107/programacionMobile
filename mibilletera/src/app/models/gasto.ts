// Modelo de un gasto (tabla `gasto`). Es el corazón de la app.
export interface Gasto {
  id?: number;
  descripcion: string;
  monto: number;
  categoria_id: number;
  fecha: string;
  foto?: string;
  latitud?: number;
  longitud?: number;
  // Campos auxiliares: no están en la tabla, se rellenan al hacer JOIN con `categoria`
  // para mostrar el nombre y el icono de la categoría en la lista.
  categoria_nombre?: string;
  categoria_icono?: string;
}
