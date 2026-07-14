// Cuánto se ha gastado en cada categoría (calculado al vuelo con un GROUP BY).
export interface ResumenCategoria {
  categoria_id: number;
  nombre: string;
  icono?: string;
  cantidad: number; // cuántos gastos tiene la categoría
  total: number; // suma de los montos
}
