// Utilidades de fecha en hora LOCAL.
//
// No usamos `new Date().toISOString()` porque devuelve la hora en UTC.
// Chile está en UTC-4 (o UTC-3 en verano), así que un gasto registrado a las
// 21:00 del 31 de julio se guardaría como "2026-08-01T01:00:00Z": el día y el
// mes equivocados. Eso hacía que el gasto no contara en el presupuesto de julio.
//
// Guardamos la fecha como 'YYYY-MM-DDTHH:mm:ss' (sin la Z), que JavaScript
// interpreta como hora local al leerla, y que ordena cronológicamente al
// compararla como texto.

function dosDigitos(n: number): string {
  return n.toString().padStart(2, '0');
}

// Fecha y hora local: '2026-07-31T21:00:00'
export function fechaLocalISO(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = dosDigitos(fecha.getMonth() + 1);
  const dia = dosDigitos(fecha.getDate());
  const hora = dosDigitos(fecha.getHours());
  const minuto = dosDigitos(fecha.getMinutes());
  const segundo = dosDigitos(fecha.getSeconds());
  return `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
}

// Mes local: '2026-07' (el mismo formato que guarda la tabla presupuesto)
export function mesActual(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}`;
}
