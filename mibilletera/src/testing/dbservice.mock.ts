import { of } from 'rxjs';

// Mock de DbserviceService para pruebas unitarias: aísla cada página de SQLite,
// Platform y AlertController reales, que en el entorno de test (Karma/Chrome
// headless) no están disponibles.
export function crearDbServiceMock() {
  return {
    fetchGastos: () => of([]),
    fetchCategorias: () => of([]),
    fetchPresupuestos: () => of([]),
    calcularTotal: () => 0,
    buscarGastos: () => Promise.resolve([]),
    buscarCategorias: () => Promise.resolve([]),
    buscarPresupuestos: () => Promise.resolve([]),
    addGasto: () => Promise.resolve(),
    updateGasto: () => Promise.resolve(),
    deleteGasto: () => Promise.resolve(),
    getGasto: () => Promise.resolve(null),
    addCategoria: () => Promise.resolve(),
    updateCategoria: () => Promise.resolve(),
    eliminarCategoria: () => Promise.resolve(),
    usosDeCategoria: () => Promise.resolve({ gastos: 0, presupuestos: 0 }),
    resumenPorCategoria: () => Promise.resolve([]),
    cambiarPassword: () => Promise.resolve(),
    guardarPresupuesto: () => Promise.resolve(),
    eliminarPresupuesto: () => Promise.resolve(),
    emailRegistrado: () => Promise.resolve(false),
    registrarUsuario: () => Promise.resolve(null),
    validarUsuario: () => Promise.resolve(null),
  };
}

export function crearApiServiceMock() {
  return {
    obtenerIndicadores: () =>
      of({
        version: '1.0',
        autor: 'test',
        fecha: '2026-01-01',
        uf: { codigo: 'uf', nombre: 'UF', unidad_medida: 'Pesos', fecha: '', valor: 0 },
        dolar: { codigo: 'dolar', nombre: 'Dolar', unidad_medida: 'Pesos', fecha: '', valor: 900 },
        euro: { codigo: 'euro', nombre: 'Euro', unidad_medida: 'Pesos', fecha: '', valor: 1000 },
      }),
    obtenerIndicadoresAsync: () => Promise.resolve({}),
    convertirTotal: () => Promise.resolve(0),
    leerCache: () => null,
  };
}
