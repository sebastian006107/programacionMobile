import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

import { DbserviceService } from '../services/dbservice.service';
import { Categoria } from '../models/categoria';

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.page.html',
  styleUrls: ['./categorias.page.scss'],
  standalone: false,
})
export class CategoriasPage implements OnInit {
  categorias: Categoria[] = [];

  // Formulario. Si editandoId tiene valor, estamos modificando en vez de creando.
  nombre: string = '';
  icono: string = 'pricetag';
  editandoId: number | null = null;

  // Iconos disponibles (ionicons, ya vienen incluidos en Ionic).
  // Cada uno con una etiqueta en español, para no mostrar el nombre técnico al usuario.
  readonly iconos: { nombre: string; etiqueta: string }[] = [
    { nombre: 'fast-food', etiqueta: 'Comida rápida' },
    { nombre: 'restaurant', etiqueta: 'Restaurante' },
    { nombre: 'cafe', etiqueta: 'Café' },
    { nombre: 'bus', etiqueta: 'Transporte' },
    { nombre: 'car', etiqueta: 'Auto' },
    { nombre: 'airplane', etiqueta: 'Viajes' },
    { nombre: 'game-controller', etiqueta: 'Juegos' },
    { nombre: 'film', etiqueta: 'Cine' },
    { nombre: 'cart', etiqueta: 'Compras' },
    { nombre: 'home', etiqueta: 'Hogar' },
    { nombre: 'medkit', etiqueta: 'Salud' },
    { nombre: 'school', etiqueta: 'Educación' },
    { nombre: 'shirt', etiqueta: 'Ropa' },
    { nombre: 'gift', etiqueta: 'Regalos' },
    { nombre: 'fitness', etiqueta: 'Deporte' },
    { nombre: 'pricetag', etiqueta: 'General' },
  ];

  constructor(
    private dbService: DbserviceService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.dbService.fetchCategorias().subscribe((categorias) => {
      this.categorias = categorias;
    });
  }

  get editando(): boolean {
    return this.editandoId !== null;
  }

  async guardar() {
    const nombre = this.nombre.trim();
    if (!nombre) {
      await this.mostrarAlerta('Falta el nombre', 'Escribe un nombre para la categoría.');
      return;
    }

    // No permitimos dos categorías con el mismo nombre (ignorando mayúsculas).
    const repetida = this.categorias.some(
      (c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== this.editandoId
    );
    if (repetida) {
      await this.mostrarAlerta('Nombre repetido', `Ya existe una categoría llamada "${nombre}".`);
      return;
    }

    if (this.editandoId !== null) {
      await this.dbService.updateCategoria({ id: this.editandoId, nombre, icono: this.icono });
    } else {
      await this.dbService.addCategoria({ nombre, icono: this.icono });
    }
    this.cancelarEdicion();
  }

  editar(categoria: Categoria) {
    this.editandoId = categoria.id ?? null;
    this.nombre = categoria.nombre;
    this.icono = categoria.icono ?? 'pricetag';
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.nombre = '';
    this.icono = 'pricetag';
  }

  async eliminar(categoria: Categoria) {
    if (categoria.id == null) {
      return;
    }

    // Una categoría usada por gastos o presupuestos no se puede borrar:
    // dejaría filas apuntando a una categoría inexistente.
    const usos = await this.dbService.usosDeCategoria(categoria.id);
    if (usos.gastos > 0 || usos.presupuestos > 0) {
      const partes: string[] = [];
      if (usos.gastos > 0) {
        partes.push(`${usos.gastos} ${usos.gastos === 1 ? 'gasto' : 'gastos'}`);
      }
      if (usos.presupuestos > 0) {
        partes.push(`${usos.presupuestos} ${usos.presupuestos === 1 ? 'presupuesto' : 'presupuestos'}`);
      }
      await this.mostrarAlerta(
        'No se puede eliminar',
        `"${categoria.nombre}" está en uso por ${partes.join(' y ')}. Reasígnalos o elimínalos primero.`
      );
      return;
    }

    const alerta = await this.alertController.create({
      header: 'Eliminar categoría',
      message: `¿Eliminar "${categoria.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.dbService.eliminarCategoria(categoria.id!);
            if (this.editandoId === categoria.id) {
              this.cancelarEdicion();
            }
          },
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
