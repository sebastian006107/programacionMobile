// Modelo de un presupuesto por categoría y mes (tabla `presupuesto`)
export interface Presupuesto {
  id?: number;
  categoria_id: number;
  monto_limite: number;
  mes: string; // formato 'YYYY-MM'
  // Campos auxiliares para comparar contra lo gastado (se rellenan al consultar)
  categoria_nombre?: string;
  gastado?: number;
}
