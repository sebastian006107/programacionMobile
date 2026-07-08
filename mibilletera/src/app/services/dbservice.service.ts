import { Injectable } from '@angular/core';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Platform, AlertController } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';

import { Gasto } from '../models/gasto';
import { Categoria } from '../models/categoria';
import { Usuario } from '../models/usuario';
import { Presupuesto } from '../models/presupuesto';

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
    // Mismos datos sembrados que en SQLite
    this.categoriasWeb = [
      { id: 1, nombre: 'Comida', icono: 'fast-food' },
      { id: 2, nombre: 'Transporte', icono: 'bus' },
      { id: 3, nombre: 'Ocio', icono: 'game-controller' },
      { id: 4, nombre: 'Otros', icono: 'pricetag' },
    ];
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

      await this.sembrarDatos();

      // Cargar el estado inicial en memoria
      await this.buscarCategorias();
      await this.buscarGastos();

      // Avisar a las páginas que la BD ya está lista
      this.isDbReady.next(true);
    } catch (e) {
      this.presentarAlerta('Error al crear las tablas', JSON.stringify(e));
    }
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

  dbState(): Observable<boolean> {
    return this.isDbReady.asObservable();
  }

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
    if (this.esWeb) {
      return this.gastosWeb.find((g) => g.id === id) ?? null;
    }
    const res = await this.database.executeSql('SELECT * FROM gasto WHERE id = ?', [id]);
    return res.rows.length > 0 ? res.rows.item(0) : null;
  }

  // --- Presupuestos (Fase 7) ---

  // Trae los presupuestos de un mes ('YYYY-MM') con su categoría y lo gastado en ella.
  // El "gastado" se calcula al vuelo sumando los gastos de esa categoría en ese mes.
  async buscarPresupuestos(mes: string): Promise<Presupuesto[]> {
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

  // ¿Ya existe un usuario con ese email?
  async emailRegistrado(email: string): Promise<boolean> {
    if (this.esWeb) {
      return this.usuariosWeb.some((u) => u.email === email);
    }
    const res = await this.database.executeSql('SELECT id FROM usuario WHERE email = ?', [email]);
    return res.rows.length > 0;
  }

  // Crea la cuenta. Devuelve el usuario creado, o null si el email ya estaba tomado.
  // NOTA: el password se guarda en texto plano solo por ser proyecto académico.
  // Mejora futura: almacenar un hash con salt (p. ej. bcrypt).
  async registrarUsuario(usuario: Usuario): Promise<Usuario | null> {
    if (await this.emailRegistrado(usuario.email)) {
      return null;
    }

    if (this.esWeb) {
      const nuevo: Usuario = { ...usuario, id: ++this.secuenciaUsuarioWeb };
      this.usuariosWeb.push(nuevo);
      this.guardarUsuariosWeb();
      return nuevo;
    }

    await this.database.executeSql(
      'INSERT INTO usuario (nombre, email, password) VALUES (?, ?, ?)',
      [usuario.nombre, usuario.email, usuario.password]
    );
    return this.validarUsuario(usuario.email, usuario.password);
  }

  // --- Login (Fase 4) ---
  // Valida email + password contra la tabla usuario. Devuelve el usuario o null.
  async validarUsuario(email: string, password: string): Promise<Usuario | null> {
    if (this.esWeb) {
      return (
        this.usuariosWeb.find((u) => u.email === email && u.password === password) ?? null
      );
    }
    const res = await this.database.executeSql(
      'SELECT * FROM usuario WHERE email = ? AND password = ?',
      [email, password]
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
