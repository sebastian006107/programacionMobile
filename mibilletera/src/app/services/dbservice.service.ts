import { Injectable } from '@angular/core';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Platform, AlertController } from '@ionic/angular';
import { BehaviorSubject, Observable, filter, firstValueFrom, take, timeout } from 'rxjs';

import { Gasto } from '../models/gasto';
import { Categoria } from '../models/categoria';
import { Usuario } from '../models/usuario';
import { Presupuesto } from '../models/presupuesto';
import { ResumenCategoria } from '../models/resumen-categoria';

@Injectable({
  providedIn: 'root',
})
export class DbserviceService {
  // Objeto de conexión a la base de datos SQLite (solo en dispositivo)
  private database!: SQLiteObject;

  // ¿Estamos en navegador (ionic serve) en vez de en un dispositivo?
  // En dispositivo (Android) usamos SQLite real, como exige la rúbrica.
  // En navegador SQLite no existe, así que usamos un respaldo en memoria +
  // LocalStorage para poder previsualizar la app (login, CRUD, navegación).
  private esWeb: boolean = false;

  // Respaldo en memoria para el modo navegador
  private categoriasWeb: Categoria[] = [];
  private usuariosWeb: Usuario[] = [];
  private gastosWeb: Gasto[] = [];
  private presupuestosWeb: Presupuesto[] = [];
  private secuenciaWeb: number = 0; // simula el AUTOINCREMENT del id
  private secuenciaPresupuestoWeb: number = 0;
  private secuenciaUsuarioWeb: number = 0;
  private secuenciaCategoriaWeb: number = 0;

  // Flag observable: indica cuándo la BD ya está creada y lista para usarse.
  // Las páginas se suscriben a esto antes de pedir datos.
  private isDbReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  // Estado en memoria (RxJS): la lista de gastos que las páginas consumen.
  // Se actualiza tras cada operación CRUD.
  private listaGastos: BehaviorSubject<Gasto[]> = new BehaviorSubject<Gasto[]>([]);

  // Lista de categorías en memoria (para llenar el <ion-select> del formulario).
  private listaCategorias: BehaviorSubject<Categoria[]> = new BehaviorSubject<Categoria[]>([]);

  // Presupuestos del mes consultado, con lo gastado ya calculado (Fase 7).
  private listaPresupuestos: BehaviorSubject<Presupuesto[]> = new BehaviorSubject<Presupuesto[]>([]);

  // --- Sentencias SQL para crear las 4 tablas (sección 4 de la spec) ---
  private tablaCategoria: string =
    'CREATE TABLE IF NOT EXISTS categoria (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, icono TEXT);';

  private tablaGasto: string =
    'CREATE TABLE IF NOT EXISTS gasto (id INTEGER PRIMARY KEY AUTOINCREMENT, descripcion TEXT NOT NULL, monto REAL NOT NULL, categoria_id INTEGER NOT NULL, fecha TEXT NOT NULL, foto TEXT, latitud REAL, longitud REAL, FOREIGN KEY (categoria_id) REFERENCES categoria(id));';

  private tablaPresupuesto: string =
    'CREATE TABLE IF NOT EXISTS presupuesto (id INTEGER PRIMARY KEY AUTOINCREMENT, categoria_id INTEGER NOT NULL, monto_limite REAL NOT NULL, mes TEXT NOT NULL, FOREIGN KEY (categoria_id) REFERENCES categoria(id));';

  private tablaUsuario: string =
    'CREATE TABLE IF NOT EXISTS usuario (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, email TEXT NOT NULL, password TEXT NOT NULL);';

  // El email debe ser único, sin distinguir mayúsculas. Se hace con un índice único
  // (y no con UNIQUE en la columna) porque SQLite no permite añadir esa restricción
  // a una tabla que ya existe: así también quedan protegidas las bases ya creadas.
  private indiceEmailUnico: string =
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email ON usuario (email COLLATE NOCASE);';

  constructor(
    private sqlite: SQLite,
    private platform: Platform,
    private alertController: AlertController
  ) {
    // 'hybrid' es true en Cordova/Capacitor nativo (dispositivo real).
    this.esWeb = !this.platform.is('hybrid');
    if (this.esWeb) {
      this.iniciarWeb();
    } else {
      this.crearBD();
    }
  }

  // =========================================================================
  //  MODO NAVEGADOR (respaldo en memoria + LocalStorage)
  // =========================================================================
  private iniciarWeb() {
    // Las categorías persisten: si no, las que cree el usuario se perderían al recargar.
    const categoriasGuardadas = localStorage.getItem('categorias_web');
    this.categoriasWeb = categoriasGuardadas
      ? JSON.parse(categoriasGuardadas)
      : [
          { id: 1, nombre: 'Comida', icono: 'fast-food' },
          { id: 2, nombre: 'Transporte', icono: 'bus' },
          { id: 3, nombre: 'Ocio', icono: 'game-controller' },
          { id: 4, nombre: 'Otros', icono: 'pricetag' },
        ];
    this.secuenciaCategoriaWeb = this.categoriasWeb.reduce((max, c) => Math.max(max, c.id ?? 0), 0);
    // Los usuarios también persisten, para que una cuenta creada sobreviva a la recarga.
    const usuariosGuardados = localStorage.getItem('usuarios_web');
    this.usuariosWeb = usuariosGuardados
      ? JSON.parse(usuariosGuardados)
      : [{ id: 1, nombre: 'Usuario Demo', email: 'demo@mibilletera.cl', password: '1234' }];
    this.secuenciaUsuarioWeb = this.usuariosWeb.reduce((max, u) => Math.max(max, u.id ?? 0), 0);

    // Los gastos persisten en LocalStorage para que sobrevivan a recargas
    const guardado = localStorage.getItem('gastos_web');
    this.gastosWeb = guardado ? JSON.parse(guardado) : [];
    this.secuenciaWeb = this.gastosWeb.reduce((max, g) => Math.max(max, g.id ?? 0), 0);

    const presupuestosGuardados = localStorage.getItem('presupuestos_web');
    this.presupuestosWeb = presupuestosGuardados ? JSON.parse(presupuestosGuardados) : [];
    this.secuenciaPresupuestoWeb = this.presupuestosWeb.reduce((max, p) => Math.max(max, p.id ?? 0), 0);

    this.listaCategorias.next([...this.categoriasWeb]);
    this.emitirGastosWeb();
    this.isDbReady.next(true);
  }

  private guardarGastosWeb() {
    localStorage.setItem('gastos_web', JSON.stringify(this.gastosWeb));
  }

  private guardarPresupuestosWeb() {
    localStorage.setItem('presupuestos_web', JSON.stringify(this.presupuestosWeb));
  }

  private guardarUsuariosWeb() {
    localStorage.setItem('usuarios_web', JSON.stringify(this.usuariosWeb));
  }

  private guardarCategoriasWeb() {
    localStorage.setItem('categorias_web', JSON.stringify(this.categoriasWeb));
  }

  // Arma los presupuestos del mes con su categoría y lo gastado calculado.
  private emitirPresupuestosWeb(mes: string) {
    const items = this.presupuestosWeb
      .filter((p) => p.mes === mes)
      .map((p) => ({
        ...p,
        categoria_nombre: this.categoriasWeb.find((c) => c.id === p.categoria_id)?.nombre,
        gastado: this.gastosWeb
          .filter((g) => g.categoria_id === p.categoria_id && g.fecha.substring(0, 7) === mes)
          .reduce((suma, g) => suma + g.monto, 0),
      }))
      .sort((a, b) => (a.categoria_nombre ?? '').localeCompare(b.categoria_nombre ?? ''));
    this.listaPresupuestos.next(items);
  }

  // Reconstruye la lista con el nombre de categoría (JOIN) y ordenada por fecha DESC.
  private emitirGastosWeb() {
    const items = this.gastosWeb
      .map((g) => {
        const categoria = this.categoriasWeb.find((c) => c.id === g.categoria_id);
        return { ...g, categoria_nombre: categoria?.nombre, categoria_icono: categoria?.icono };
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    this.listaGastos.next(items);
  }

  // =========================================================================
  //  MODO DISPOSITIVO (SQLite real)
  // =========================================================================
  private crearBD() {
    this.platform.ready().then(() => {
      this.sqlite
        .create({
          name: 'mibilletera.db',
          location: 'default',
        })
        .then((db: SQLiteObject) => {
          this.database = db;
          this.crearTablas();
        })
        .catch((e) => this.presentarAlerta('Error al crear la BD', JSON.stringify(e)));
    });
  }

  // Crea las 4 tablas y luego siembra los datos iniciales.
  private async crearTablas() {
    try {
      await this.database.executeSql(this.tablaCategoria, []);
      await this.database.executeSql(this.tablaGasto, []);
      await this.database.executeSql(this.tablaPresupuesto, []);
      await this.database.executeSql(this.tablaUsuario, []);
      await this.database.executeSql(this.indiceEmailUnico, []);

      await this.sembrarDatos();

      // La BD ya es utilizable: avisamos ANTES de las cargas iniciales.
      // Si lo hiciéramos después, buscarCategorias() y buscarGastos() se quedarían
      // esperando en esperarBD() a un flag que nunca llegaría (bloqueo mutuo).
      this.isDbReady.next(true);

      // Cargar el estado inicial en memoria
      await this.buscarCategorias();
      await this.buscarGastos();
    } catch (e) {
      this.presentarAlerta('Error al crear las tablas', JSON.stringify(e));
    }
  }

  // Espera a que la BD esté creada antes de consultarla.
  //
  // Sin esto había una carrera: en el dispositivo, si el usuario tocaba "Ingresar"
  // antes de que SQLite terminara de abrirse, `this.database` era undefined y la app
  // lanzaba una excepción. El timeout evita quedarse colgado si la BD nunca abre.
  private async esperarBD(): Promise<void> {
    if (this.isDbReady.getValue()) {
      return;
    }
    await firstValueFrom(
      this.isDbReady.pipe(
        filter((listo) => listo),
        take(1),
        timeout(10000)
      )
    );
  }

  // Siembra categorías por defecto y un usuario de prueba, solo si aún no existen.
  private async sembrarDatos() {
    // Categorías por defecto
    const cats = await this.database.executeSql('SELECT COUNT(*) AS total FROM categoria', []);
    if (cats.rows.item(0).total === 0) {
      const porDefecto: Categoria[] = [
        { nombre: 'Comida', icono: 'fast-food' },
        { nombre: 'Transporte', icono: 'bus' },
        { nombre: 'Ocio', icono: 'game-controller' },
        { nombre: 'Otros', icono: 'pricetag' },
      ];
      for (const c of porDefecto) {
        await this.database.executeSql('INSERT INTO categoria (nombre, icono) VALUES (?, ?)', [
          c.nombre,
          c.icono,
        ]);
      }
    }

    // Usuario de prueba para poder iniciar sesión (Fase 4)
    const users = await this.database.executeSql('SELECT COUNT(*) AS total FROM usuario', []);
    if (users.rows.item(0).total === 0) {
      await this.database.executeSql(
        'INSERT INTO usuario (nombre, email, password) VALUES (?, ?, ?)',
        ['Usuario Demo', 'demo@mibilletera.cl', '1234']
      );
    }
  }

  // --- Observables que consumen las páginas ---

  fetchGastos(): Observable<Gasto[]> {
    return this.listaGastos.asObservable();
  }

  fetchCategorias(): Observable<Categoria[]> {
    return this.listaCategorias.asObservable();
  }

  fetchPresupuestos(): Observable<Presupuesto[]> {
    return this.listaPresupuestos.asObservable();
  }

  // --- Lectura ---

  // Trae todos los gastos con el nombre de su categoría (JOIN) y actualiza el BehaviorSubject.
  async buscarGastos(): Promise<Gasto[]> {
    await this.esperarBD();
    if (this.esWeb) {
      this.emitirGastosWeb();
      return this.listaGastos.getValue();
    }
    const sql =
      'SELECT g.*, c.nombre AS categoria_nombre, c.icono AS categoria_icono FROM gasto g ' +
      'INNER JOIN categoria c ON c.id = g.categoria_id ORDER BY g.fecha DESC';
    const res = await this.database.executeSql(sql, []);
    const items: Gasto[] = [];
    for (let i = 0; i < res.rows.length; i++) {
      items.push(res.rows.item(i));
    }
    this.listaGastos.next(items);
    return items;
  }

  async buscarCategorias(): Promise<Categoria[]> {
    await this.esperarBD();
    if (this.esWeb) {
      this.listaCategorias.next([...this.categoriasWeb]);
      return this.categoriasWeb;
    }
    const res = await this.database.executeSql('SELECT * FROM categoria ORDER BY nombre', []);
    const items: Categoria[] = [];
    for (let i = 0; i < res.rows.length; i++) {
      items.push(res.rows.item(i));
    }
    this.listaCategorias.next(items);
    return items;
  }

  // El total NO se guarda en BD: se calcula al vuelo sumando los montos.
  calcularTotal(): number {
    return this.listaGastos.getValue().reduce((suma, g) => suma + g.monto, 0);
  }

  // --- Escritura (CRUD) ---

  async addGasto(gasto: Gasto): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      this.gastosWeb.push({ ...gasto, id: ++this.secuenciaWeb });
      this.guardarGastosWeb();
      this.emitirGastosWeb();
      return;
    }
    await this.database.executeSql(
      'INSERT INTO gasto (descripcion, monto, categoria_id, fecha, foto, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        gasto.descripcion,
        gasto.monto,
        gasto.categoria_id,
        gasto.fecha,
        gasto.foto ?? null,
        gasto.latitud ?? null,
        gasto.longitud ?? null,
      ]
    );
    await this.buscarGastos();
  }

  async updateGasto(gasto: Gasto): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      const i = this.gastosWeb.findIndex((g) => g.id === gasto.id);
      if (i >= 0) {
        this.gastosWeb[i] = { ...gasto };
        this.guardarGastosWeb();
        this.emitirGastosWeb();
      }
      return;
    }
    await this.database.executeSql(
      'UPDATE gasto SET descripcion = ?, monto = ?, categoria_id = ?, fecha = ?, foto = ?, latitud = ?, longitud = ? WHERE id = ?',
      [
        gasto.descripcion,
        gasto.monto,
        gasto.categoria_id,
        gasto.fecha,
        gasto.foto ?? null,
        gasto.latitud ?? null,
        gasto.longitud ?? null,
        gasto.id,
      ]
    );
    await this.buscarGastos();
  }

  async deleteGasto(id: number): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      this.gastosWeb = this.gastosWeb.filter((g) => g.id !== id);
      this.guardarGastosWeb();
      this.emitirGastosWeb();
      return;
    }
    await this.database.executeSql('DELETE FROM gasto WHERE id = ?', [id]);
    await this.buscarGastos();
  }

  // Trae un gasto puntual (para precargar el formulario de editar en la Fase 3).
  async getGasto(id: number): Promise<Gasto | null> {
    await this.esperarBD();
    if (this.esWeb) {
      return this.gastosWeb.find((g) => g.id === id) ?? null;
    }
    const res = await this.database.executeSql('SELECT * FROM gasto WHERE id = ?', [id]);
    return res.rows.length > 0 ? res.rows.item(0) : null;
  }

  // --- Categorías (CRUD) ---

  // Cuántos gastos y presupuestos dependen de una categoría.
  // Se consulta antes de borrar: si algo la usa, borrarla rompería la integridad referencial.
  async usosDeCategoria(id: number): Promise<{ gastos: number; presupuestos: number }> {
    await this.esperarBD();
    if (this.esWeb) {
      return {
        gastos: this.gastosWeb.filter((g) => g.categoria_id === id).length,
        presupuestos: this.presupuestosWeb.filter((p) => p.categoria_id === id).length,
      };
    }
    const g = await this.database.executeSql(
      'SELECT COUNT(*) AS total FROM gasto WHERE categoria_id = ?',
      [id]
    );
    const p = await this.database.executeSql(
      'SELECT COUNT(*) AS total FROM presupuesto WHERE categoria_id = ?',
      [id]
    );
    return { gastos: g.rows.item(0).total, presupuestos: p.rows.item(0).total };
  }

  async addCategoria(categoria: Categoria): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      this.categoriasWeb.push({ ...categoria, id: ++this.secuenciaCategoriaWeb });
      this.guardarCategoriasWeb();
    } else {
      await this.database.executeSql('INSERT INTO categoria (nombre, icono) VALUES (?, ?)', [
        categoria.nombre,
        categoria.icono ?? null,
      ]);
    }
    await this.buscarCategorias();
  }

  async updateCategoria(categoria: Categoria): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      const i = this.categoriasWeb.findIndex((c) => c.id === categoria.id);
      if (i >= 0) {
        this.categoriasWeb[i] = { ...categoria };
        this.guardarCategoriasWeb();
      }
    } else {
      await this.database.executeSql('UPDATE categoria SET nombre = ?, icono = ? WHERE id = ?', [
        categoria.nombre,
        categoria.icono ?? null,
        categoria.id,
      ]);
    }
    await this.buscarCategorias();
    // La lista de gastos muestra el nombre y el icono de su categoría: hay que refrescarla.
    await this.buscarGastos();
  }

  async eliminarCategoria(id: number): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      this.categoriasWeb = this.categoriasWeb.filter((c) => c.id !== id);
      this.guardarCategoriasWeb();
    } else {
      await this.database.executeSql('DELETE FROM categoria WHERE id = ?', [id]);
    }
    await this.buscarCategorias();
  }

  // --- Resumen por categoría ---

  // Cuánto se ha gastado en cada categoría. LEFT JOIN para incluir también
  // las categorías sin gastos (aparecen con total 0).
  async resumenPorCategoria(): Promise<ResumenCategoria[]> {
    await this.esperarBD();
    if (this.esWeb) {
      return this.categoriasWeb
        .map((c) => {
          const suyos = this.gastosWeb.filter((g) => g.categoria_id === c.id);
          return {
            categoria_id: c.id!,
            nombre: c.nombre,
            icono: c.icono,
            cantidad: suyos.length,
            total: suyos.reduce((suma, g) => suma + g.monto, 0),
          };
        })
        .sort((a, b) => b.total - a.total);
    }

    const sql =
      'SELECT c.id AS categoria_id, c.nombre, c.icono, COUNT(g.id) AS cantidad, ' +
      'COALESCE(SUM(g.monto), 0) AS total ' +
      'FROM categoria c LEFT JOIN gasto g ON g.categoria_id = c.id ' +
      'GROUP BY c.id, c.nombre, c.icono ORDER BY total DESC';
    const res = await this.database.executeSql(sql, []);
    const items: ResumenCategoria[] = [];
    for (let i = 0; i < res.rows.length; i++) {
      items.push(res.rows.item(i));
    }
    return items;
  }

  // --- Cuenta del usuario ---

  async cambiarPassword(usuarioId: number, nuevaPassword: string): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      const i = this.usuariosWeb.findIndex((u) => u.id === usuarioId);
      if (i >= 0) {
        this.usuariosWeb[i].password = nuevaPassword;
        this.guardarUsuariosWeb();
      }
      return;
    }
    await this.database.executeSql('UPDATE usuario SET password = ? WHERE id = ?', [
      nuevaPassword,
      usuarioId,
    ]);
  }

  // --- Presupuestos (Fase 7) ---

  // Trae los presupuestos de un mes ('YYYY-MM') con su categoría y lo gastado en ella.
  // El "gastado" se calcula al vuelo sumando los gastos de esa categoría en ese mes.
  async buscarPresupuestos(mes: string): Promise<Presupuesto[]> {
    await this.esperarBD();
    if (this.esWeb) {
      this.emitirPresupuestosWeb(mes);
      return this.listaPresupuestos.getValue();
    }
    const sql =
      'SELECT p.*, c.nombre AS categoria_nombre, ' +
      '(SELECT COALESCE(SUM(g.monto), 0) FROM gasto g ' +
      ' WHERE g.categoria_id = p.categoria_id AND substr(g.fecha, 1, 7) = p.mes) AS gastado ' +
      'FROM presupuesto p INNER JOIN categoria c ON c.id = p.categoria_id ' +
      'WHERE p.mes = ? ORDER BY c.nombre';
    const res = await this.database.executeSql(sql, [mes]);
    const items: Presupuesto[] = [];
    for (let i = 0; i < res.rows.length; i++) {
      items.push(res.rows.item(i));
    }
    this.listaPresupuestos.next(items);
    return items;
  }

  // Crea o actualiza el presupuesto de una categoría en un mes (no se duplica).
  async guardarPresupuesto(presupuesto: Presupuesto): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      const i = this.presupuestosWeb.findIndex(
        (p) => p.categoria_id === presupuesto.categoria_id && p.mes === presupuesto.mes
      );
      if (i >= 0) {
        this.presupuestosWeb[i].monto_limite = presupuesto.monto_limite;
      } else {
        this.presupuestosWeb.push({ ...presupuesto, id: ++this.secuenciaPresupuestoWeb });
      }
      this.guardarPresupuestosWeb();
      this.emitirPresupuestosWeb(presupuesto.mes);
      return;
    }

    const existente = await this.database.executeSql(
      'SELECT id FROM presupuesto WHERE categoria_id = ? AND mes = ?',
      [presupuesto.categoria_id, presupuesto.mes]
    );
    if (existente.rows.length > 0) {
      await this.database.executeSql('UPDATE presupuesto SET monto_limite = ? WHERE id = ?', [
        presupuesto.monto_limite,
        existente.rows.item(0).id,
      ]);
    } else {
      await this.database.executeSql(
        'INSERT INTO presupuesto (categoria_id, monto_limite, mes) VALUES (?, ?, ?)',
        [presupuesto.categoria_id, presupuesto.monto_limite, presupuesto.mes]
      );
    }
    await this.buscarPresupuestos(presupuesto.mes);
  }

  async eliminarPresupuesto(id: number, mes: string): Promise<void> {
    await this.esperarBD();
    if (this.esWeb) {
      this.presupuestosWeb = this.presupuestosWeb.filter((p) => p.id !== id);
      this.guardarPresupuestosWeb();
      this.emitirPresupuestosWeb(mes);
      return;
    }
    await this.database.executeSql('DELETE FROM presupuesto WHERE id = ?', [id]);
    await this.buscarPresupuestos(mes);
  }

  // --- Registro de cuenta ---

  // El email nunca distingue mayúsculas. Se normaliza aquí, en el servicio, para que
  // ninguna página pueda olvidarlo: antes el registro lo pasaba a minúsculas y el login
  // no, así que quien se registraba con "Seba@Duoc.cl" no podía volver a entrar.
  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // ¿Ya existe un usuario con ese email?
  async emailRegistrado(email: string): Promise<boolean> {
    await this.esperarBD();
    const buscado = this.normalizarEmail(email);
    if (this.esWeb) {
      return this.usuariosWeb.some((u) => this.normalizarEmail(u.email) === buscado);
    }
    // COLLATE NOCASE: también encuentra cuentas antiguas guardadas con mayúsculas.
    const res = await this.database.executeSql(
      'SELECT id FROM usuario WHERE email = ? COLLATE NOCASE',
      [buscado]
    );
    return res.rows.length > 0;
  }

  // Crea la cuenta. Devuelve el usuario creado, o null si el email ya estaba tomado.
  // NOTA: el password se guarda en texto plano solo por ser proyecto académico.
  // Mejora futura: almacenar un hash con salt (p. ej. bcrypt).
  async registrarUsuario(usuario: Usuario): Promise<Usuario | null> {
    await this.esperarBD();
    const email = this.normalizarEmail(usuario.email);

    if (await this.emailRegistrado(email)) {
      return null;
    }

    if (this.esWeb) {
      const nuevo: Usuario = { ...usuario, email, id: ++this.secuenciaUsuarioWeb };
      this.usuariosWeb.push(nuevo);
      this.guardarUsuariosWeb();
      return nuevo;
    }

    await this.database.executeSql(
      'INSERT INTO usuario (nombre, email, password) VALUES (?, ?, ?)',
      [usuario.nombre, email, usuario.password]
    );
    return this.validarUsuario(email, usuario.password);
  }

  // --- Login (Fase 4) ---
  // Valida email + password contra la tabla usuario. Devuelve el usuario o null.
  // El email no distingue mayúsculas; la contraseña sí.
  async validarUsuario(email: string, password: string): Promise<Usuario | null> {
    await this.esperarBD();
    const buscado = this.normalizarEmail(email);
    if (this.esWeb) {
      return (
        this.usuariosWeb.find(
          (u) => this.normalizarEmail(u.email) === buscado && u.password === password
        ) ?? null
      );
    }
    const res = await this.database.executeSql(
      'SELECT * FROM usuario WHERE email = ? COLLATE NOCASE AND password = ?',
      [buscado, password]
    );
    return res.rows.length > 0 ? res.rows.item(0) : null;
  }

  // Utilidad para mostrar errores de la BD.
  private async presentarAlerta(titulo: string, mensaje: string) {
    const alerta = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK'],
    });
    await alerta.present();
  }
}
