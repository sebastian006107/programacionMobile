import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

import { DbserviceService } from '../services/dbservice.service';
import { Categoria } from '../models/categoria';
import { Presupuesto } from '../models/presupuesto';

@Component({
  selector: 'app-presupuesto',
  templateUrl: './presupuesto.page.html',
  styleUrls: ['./presupuesto.page.scss'],
  standalone: false,
})
export class PresupuestoPage implements OnInit {
  // Mes en formato 'YYYY-MM' (el mismo que guarda la tabla presupuesto)
  mes: string = new Date().toISOString().substring(0, 7);

  categorias: Categoria[] = [];
  presupuestos: Presupuesto[] = [];

  // Formulario
  categoriaId: number | null = null;
  montoLimite: number | null = null;

  constructor(
    private dbService: DbserviceService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.dbService.fetchCategorias().subscribe((categorias) => {
      this.categorias = categorias;
    });

    // Estado en memoria: la lista se actualiza sola tras guardar/eliminar.
    this.dbService.fetchPresupuestos().subscribe((presupuestos) => {
      this.presupuestos = presupuestos;
    });

    this.cargar();
  }

  // Recarga los presupuestos del mes seleccionado.
  async cargar() {
    try {
      await this.dbService.buscarPresupuestos(this.mes);
    } catch (e) {
      // La BD aún no está lista; el BehaviorSubject se llenará luego.
    }
  }

  cambiarMes() {
    this.cargar();
  }

  async guardar() {
    if (this.categoriaId == null || this.montoLimite == null) {
      await this.mostrarAlerta('Faltan datos', 'Elige una categoría y un monto límite.');
      return;
    }
    if (this.montoLimite <= 0) {
      await this.mostrarAlerta('Monto inválido', 'El límite debe ser mayor a 0.');
      return;
    }

    const presupuesto: Presupuesto = {
      categoria_id: this.categoriaId,
      monto_limite: Number(this.montoLimite),
      mes: this.mes,
    };

    await this.dbService.guardarPresupuesto(presupuesto);

    // Limpiar el formulario
    this.categoriaId = null;
    this.montoLimite = null;
  }

  async eliminar(presupuesto: Presupuesto) {
    if (presupuesto.id == null) {
      return;
    }
    const alerta = await this.alertController.create({
      header: 'Eliminar presupuesto',
      message: `¿Eliminar el presupuesto de ${presupuesto.categoria_nombre}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.dbService.eliminarPresupuesto(presupuesto.id!, this.mes),
        },
      ],
    });
    await alerta.present();
  }

  // --- Cálculos para comparar gastado vs límite ---

  // Proporción gastada (0 a 1). Se usa en la barra de progreso.
  proporcion(p: Presupuesto): number {
    if (!p.monto_limite) {
      return 0;
    }
    return Math.min((p.gastado ?? 0) / p.monto_limite, 1);
  }

  // Porcentaje para mostrar como texto (puede pasar de 100).
  porcentaje(p: Presupuesto): number {
    if (!p.monto_limite) {
      return 0;
    }
    return ((p.gastado ?? 0) / p.monto_limite) * 100;
  }

  // Lo que queda disponible (negativo si se pasó).
  restante(p: Presupuesto): number {
    return p.monto_limite - (p.gastado ?? 0);
  }

  excedido(p: Presupuesto): boolean {
    return (p.gastado ?? 0) > p.monto_limite;
  }

  // Color de la barra: primario (taupe) bajo control, amarillo cerca del límite,
  // rojo si se pasó. No usamos 'success' porque su verde choca con la paleta beige.
  color(p: Presupuesto): string {
    const prop = this.porcentaje(p) / 100;
    if (prop >= 1) {
      return 'danger';
    }
    if (prop >= 0.8) {
      return 'warning';
    }
    return 'primary';
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
