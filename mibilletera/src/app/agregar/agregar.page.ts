import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

import { DbserviceService } from '../services/dbservice.service';
import { Categoria } from '../models/categoria';
import { Gasto } from '../models/gasto';
import { fechaLocalISO } from '../utils/fecha';

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  standalone: false,
})
export class AgregarPage implements OnInit {
  descripcion: string = '';
  monto: number | null = null;
  categoriaId: number | null = null;
  categorias: Categoria[] = [];

  // Datos capturados con los plugins nativos (Fase 5)
  foto?: string;
  latitud?: number;
  longitud?: number;
  cargandoUbicacion: boolean = false;

  constructor(
    private dbService: DbserviceService,
    private router: Router,
    private platform: Platform,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Categorías para el <ion-select>
    this.dbService.fetchCategorias().subscribe((categorias) => {
      this.categorias = categorias;
    });
  }

  // --- Plugin de cámara: foto del recibo ---
  async tomarFoto() {
    try {
      const imagen = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        // En dispositivo abrimos la cámara real; en navegador, el selector de archivos
        // (la cámara web requeriría una librería extra que la spec no permite).
        source: this.platform.is('hybrid') ? CameraSource.Camera : CameraSource.Photos,
      });
      this.foto = imagen.dataUrl;
    } catch (e) {
      // El usuario canceló la cámara: no es un error que deba interrumpirlo.
    }
  }

  quitarFoto() {
    this.foto = undefined;
  }

  // --- Plugin de geolocalización: dónde se hizo el gasto ---
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

  async guardar() {
    if (!this.descripcion.trim() || this.monto == null || this.categoriaId == null) {
      await this.mostrarAlerta('Faltan datos', 'Completa descripción, monto y categoría.');
      return;
    }
    if (this.monto <= 0) {
      await this.mostrarAlerta('Monto inválido', 'El monto debe ser mayor a 0.');
      return;
    }

    const gasto: Gasto = {
      descripcion: this.descripcion.trim(),
      monto: Number(this.monto),
      categoria_id: this.categoriaId,
      fecha: fechaLocalISO(),
      foto: this.foto,
      latitud: this.latitud,
      longitud: this.longitud,
    };

    await this.dbService.addGasto(gasto);
    this.router.navigate(['/home']);
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
