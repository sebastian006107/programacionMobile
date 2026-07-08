// Un indicador económico devuelto por mindicador.cl (dolar, euro, uf, etc.)
export interface Indicador {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  fecha: string;
  valor: number;
}

// Respuesta de https://mindicador.cl/api (todos los indicadores del día)
export interface Indicadores {
  version: string;
  autor: string;
  fecha: string;
  uf: Indicador;
  dolar: Indicador;
  euro: Indicador;
}
