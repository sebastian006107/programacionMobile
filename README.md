MiBilletera

Aplicación móvil para el registro y control de gastos personales, desarrollada con Ionic + Angular y Capacitor.

Permite llevar un registro de gastos diarios, organizarlos por categorías, definir presupuestos mensuales y consultar indicadores económicos actualizados desde una API pública.

## Funcionalidades

- Registro e inicio de sesión de usuarios, con rutas protegidas mediante guard.
- CRUD completo de gastos (crear, listar, editar y eliminar).
- Administración de categorías personalizadas.
- Presupuestos mensuales con cálculo de lo gastado por categoría.
- Resumen de gastos agrupados por categoría.
- Perfil de usuario con foto (cámara del dispositivo) y ubicación (geolocalización).
- Conversión de montos a dólar y euro usando la API de [mindicador.cl](https://mindicador.cl).
- Página 404 para rutas no existentes.

## Tecnologías

| Herramienta | Versión |
|---|---|
| Angular | 20.3 |
| Ionic | 8 |
| Capacitor | 8.4 |
| SQLite | cordova-sqlite-storage 7 |
| Cypress | 15 |
| Node.js | 20 |

## Requisitos previos

- Node.js 20
- npm 10
- Android Studio (solo si se desea compilar la app en Android)

## Instalación

```bash
git clone <url-del-repositorio>
cd mibilletera
npm install
```

## Ejecución

Para levantar la aplicación en el navegador:

```bash
npm start
```

Luego abrir `http://localhost:8100/`.

> En navegador la base de datos SQLite no está disponible, por lo que el servicio usa un respaldo en memoria con LocalStorage. Esto permite probar el login, el CRUD y la navegación. En un dispositivo Android se utiliza SQLite real.

## Compilación en Android

```bash
npm run build
npx cap sync android
npx cap open android
```

Desde Android Studio se puede ejecutar la app en un emulador o dispositivo físico.

## Pruebas

Pruebas unitarias:

```bash
npm test
```

Pruebas end-to-end (requiere el servidor levantado):

```bash
npm run e2e
```

Para abrir Cypress en modo interactivo:

```bash
npm run e2e:open
```

## Estructura del proyecto

```
src/app/
├── agregar/        Formulario para registrar un gasto
├── categorias/     Administración de categorías
├── editar/         Edición de un gasto existente
├── guards/         AuthGuard para proteger rutas
├── home/           Listado principal de gastos
├── login/          Inicio de sesión
├── models/         Interfaces (Gasto, Categoria, Usuario, Presupuesto...)
├── not-found/      Página 404
├── perfil/         Perfil del usuario, cámara y geolocalización
├── presupuesto/    Presupuestos mensuales
├── registro/       Registro de nuevos usuarios
├── resumen/        Resumen de gastos por categoría
├── services/       ApiService (mindicador.cl) y DbserviceService (SQLite)
└── utils/          Funciones auxiliares de fecha
```

## Base de datos

La aplicación utiliza SQLite con cuatro tablas: `usuario`, `categoria`, `gasto` y `presupuesto`. Las páginas consumen los datos a través de observables (`BehaviorSubject`) expuestos por `DbserviceService`, que se actualizan después de cada operación.
