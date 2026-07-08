import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

import { DbserviceService } from '../services/dbservice.service';
import { Categoria } from '../models/categoria';
import { Gasto } from '../models/gasto';

@Component({
  selector: 'app-editar',
  templateUrl: './editar.page.html',
  styleUrls: ['./editar.page.scss'],
  standalone: false,
})
export class EditarPage implements OnInit {
  id!: number;
  descripcion: string = '';
  monto: number | null = null;
  categoriaId: number | null = null;
  categorias: Categoria[] = [];

  // Datos nativos (se precargan del gasto y se pueden reemplazar)
  foto?: string;
  latitud?: number;
  longitud?: number;
  cargandoUbicacion: boolean = false;

  // Guardamos el gasto original para conservar la fecha al actualizar.
  private gastoOriginal: Gasto | null = null;

  constructor(
    private dbService: DbserviceService,
    private router: Router,
    private route: ActivatedRoute,
    private platform: Platform,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.dbService.fetchCategorias().subscribe((categorias) => {
      this.categorias = categorias;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarGasto();
  }

  async cargarGasto() {
    const gasto = await this.dbService.getGasto(this.id);
    if (gasto) {
      this.gastoOriginal = gasto;
      this.descripcion = gasto.descripcion;
      this.monto = gasto.monto;
      this.categoriaId = gasto.categoria_id;
      // Precargar lo capturado con los plugins
      this.foto = gasto.foto ?? undefined;
      this.latitud = gasto.latitud ?? undefined;
      this.longitud = gasto.longitud ?? undefined;
    } else {
      await this.mostrarAlerta('No encontrado', 'El gasto no existe.');
      this.router.navigate(['/home']);
    }
  }

  // --- Plugin de cámara ---
  async tomarFoto() {
    try {
      const imagen = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: this.platform.is('hybrid') ? CameraSource.Camera : CameraSource.Photos,
      });
      this.foto = imagen.dataUrl;
    } catch (e) {
      // El usuario canceló la cámara.
    }
  }

  quitarFoto() {
    this.foto = undefined;
  }

  // --- Plugin de geolocalización ---
  async obtenerUbicacion() {
    this.cargandoUbicacion = true;
    try {
      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      this.latitud = posicion.coords.latitude;
      this.longitud = posicion.coords.longitude;
    } catch (e) {
      await this.mostrarAlerta(
        'Ubicación',
        'No se pudo obtener la ubicación. Revisa los permisos y que el GPS esté activo.'
      );
    } finally {
      this.cargandoUbicacion = false;
    }
  }

  async actualizar() {
    if (!this.descripcion.trim() || this.monto == null || this.categoriaId == null) {
      await this.mostrarAlerta('Faltan datos', 'Completa descripción, monto y categoría.');
      return;
    }
    if (this.monto <= 0) {
      await this.mostrarAlerta('Monto inválido', 'El monto debe ser mayor a 0.');
      return;
    }

    const gasto: Gasto = {
      id: this.id,
      descripcion: this.descripcion.trim(),
      monto: Number(this.monto),
      categoria_id: this.categoriaId,
      // La fecha original se conserva; foto y ubicación son las del formulario.
      fecha: this.gastoOriginal?.fecha ?? new Date().toISOString(),
      foto: this.foto,
      latitud: this.latitud,
      longitud: this.longitud,
    };

    await this.dbService.updateGasto(gasto);
    this.router.navigate(['/home']);
  }

  async eliminar() {
    const alerta = await this.alertController.create({
      header: 'Eliminar gasto',
      message: '¿Seguro que quieres eliminar este gasto?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.dbService.deleteGasto(this.id);
            this.router.navigate(['/home']);
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
