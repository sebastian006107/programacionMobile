import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { DbserviceService } from '../services/dbservice.service';
import { ApiService } from '../services/api.service';
import { Gasto } from '../models/gasto';
import { Indicadores } from '../models/indicador';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  gastos: Gasto[] = [];
  total: number = 0;

  // Conversión de moneda (API mindicador)
  indicadores: Indicadores | null = null;
  moneda: 'dolar' | 'euro' = 'dolar';
  totalConvertido: number | null = null;
  cargandoConversion: boolean = false;

  constructor(
    private dbService: DbserviceService,
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Estado en memoria (BehaviorSubject): la lista se actualiza sola tras cada CRUD.
    this.dbService.fetchGastos().subscribe((gastos) => {
      this.gastos = gastos;
      this.total = this.dbService.calcularTotal();
      // Si cambian los gastos, la conversión anterior deja de ser válida.
      this.totalConvertido = null;
    });

    // Preferencia guardada en LocalStorage (moneda elegida)
    const monedaGuardada = localStorage.getItem('moneda');
    if (monedaGuardada === 'dolar' || monedaGuardada === 'euro') {
      this.moneda = monedaGuardada;
    }

    this.cargarIndicadores();
  }

  // --- CONSULTA ASÍNCRONA a la API: GET con HttpClient + subscribe ---
  // Trae los indicadores del día para mostrarlos en pantalla.
  cargarIndicadores() {
    this.apiService.obtenerIndicadores().subscribe({
      next: (datos) => {
        this.indicadores = datos;
      },
      error: () => {
        // Sin internet la app sigue funcionando; solo no se muestran los valores.
        this.indicadores = null;
      },
    });
  }

  // Guarda la moneda elegida como preferencia y limpia la conversión previa.
  cambiarMoneda() {
    localStorage.setItem('moneda', this.moneda);
    this.totalConvertido = null;
  }

  // --- CONSULTA SÍNCRONA a la API: async/await ---
  // Espera el valor del indicador ANTES de calcular la conversión.
  async convertirTotal() {
    if (this.total <= 0) {
      await this.mostrarAlerta('Sin gastos', 'Agrega al menos un gasto para convertir el total.');
      return;
    }
    this.cargandoConversion = true;
    try {
      this.totalConvertido = await this.apiService.convertirTotal(this.total, this.moneda);
    } catch (e) {
      await this.mostrarAlerta(
        'Error de conexión',
        'No se pudo consultar mindicador.cl. Revisa tu conexión a internet.'
      );
    } finally {
      this.cargandoConversion = false;
    }
  }

  irAgregar() {
    this.router.navigate(['/agregar']);
  }

  irResumen() {
    this.router.navigate(['/resumen']);
  }

  irPerfil() {
    this.router.navigate(['/perfil']);
  }

  irEditar(id?: number) {
    if (id != null) {
      this.router.navigate(['/editar', id]);
    }
  }

  irPresupuesto() {
    this.router.navigate(['/presupuesto']);
  }

  async eliminar(id?: number) {
    if (id == null) {
      return;
    }
    const alerta = await this.alertController.create({
      header: 'Eliminar gasto',
      message: '¿Seguro que quieres eliminar este gasto?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.dbService.deleteGasto(id),
        },
      ],
    });
    await alerta.present();
  }

  private async mostrarAlerta(titulo: string, mensaje: string) {
    const alerta = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK'],
    });
    await alerta.present();
  }
}
