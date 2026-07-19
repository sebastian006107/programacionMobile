import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, AnimationController } from '@ionic/angular';

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
  // true cuando los indicadores mostrados vienen de la caché (sin internet).
  usandoCacheIndicadores: boolean = false;

  // Referencias a elementos del template para animarlos con Ionic.
  @ViewChild('tarjetaTotal', { read: ElementRef }) tarjetaTotal?: ElementRef;
  @ViewChild('resultadoConv', { read: ElementRef }) resultadoConv?: ElementRef;

  constructor(
    private dbService: DbserviceService,
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController,
    private animationCtrl: AnimationController
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

  // Cada vez que la vista entra, animamos la tarjeta del total (animación de Ionic).
  ionViewDidEnter() {
    this.animarTarjetaTotal();
  }

  // --- ANIMACIÓN DE IONIC #1: entrada de la tarjeta del total ---
  // AnimationController: aparece con un desvanecido + deslizamiento hacia arriba.
  private animarTarjetaTotal() {
    if (!this.tarjetaTotal) {
      return;
    }
    this.animationCtrl
      .create()
      .addElement(this.tarjetaTotal.nativeElement)
      .duration(600)
      .easing('ease-out')
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'translateY(20px)', 'translateY(0)')
      .play();
  }

  // --- ANIMACIÓN DE IONIC #2: aparición del resultado de la conversión ---
  // AnimationController con keyframes: escala tipo "pop" para destacar el monto.
  private animarResultado() {
    if (!this.resultadoConv) {
      return;
    }
    this.animationCtrl
      .create()
      .addElement(this.resultadoConv.nativeElement)
      .duration(500)
      .easing('ease-out')
      .keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0.8)' },
        { offset: 0.6, opacity: '1', transform: 'scale(1.1)' },
        { offset: 1, opacity: '1', transform: 'scale(1)' },
      ])
      .play();
  }

  // --- CONSULTA ASÍNCRONA a la API: GET con HttpClient + subscribe ---
  // Trae los indicadores del día para mostrarlos en pantalla.
  cargarIndicadores() {
    this.apiService.obtenerIndicadores().subscribe({
      next: (datos) => {
        this.indicadores = datos;
        this.usandoCacheIndicadores = false;
      },
      error: () => {
        // Sin internet (o error 404 de red): mostramos los últimos valores
        // guardados en caché para que la app siga siendo útil offline.
        const cache = this.apiService.leerCache();
        this.indicadores = cache;
        this.usandoCacheIndicadores = cache != null;
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
      // Espera a que Angular pinte el resultado (*ngIf) antes de animarlo.
      setTimeout(() => this.animarResultado(), 0);
    } catch (e) {
      await this.mostrarAlerta(
        'Error de conexión',
        'No se pudo consultar mindicador.cl y no hay valores guardados. Revisa tu conexión a internet.'
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
