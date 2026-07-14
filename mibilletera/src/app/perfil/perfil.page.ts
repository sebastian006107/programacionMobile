import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { DbserviceService } from '../services/dbservice.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements OnInit {
  // Datos de la sesión guardada en LocalStorage
  id: number | null = null;
  nombre: string = '';
  email: string = '';

  // Cambio de contraseña
  passwordActual: string = '';
  passwordNueva: string = '';
  passwordConfirmar: string = '';
  cambiando: boolean = false;

  constructor(
    private dbService: DbserviceService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const sesion = localStorage.getItem('sesion');
    if (sesion) {
      const datos = JSON.parse(sesion);
      this.id = datos.id ?? null;
      this.nombre = datos.nombre ?? '';
      this.email = datos.email ?? '';
    }
  }

  // Inicial del nombre, para el avatar
  get inicial(): string {
    return this.nombre ? this.nombre.charAt(0).toUpperCase() : '?';
  }

  irCategorias() {
    this.router.navigate(['/categorias']);
  }

  async cambiarPassword() {
    if (this.id == null) {
      return;
    }
    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      await this.mostrarAlerta('Faltan datos', 'Completa los tres campos.');
      return;
    }
    if (this.passwordNueva.length < 4) {
      await this.mostrarAlerta('Contraseña corta', 'La nueva debe tener al menos 4 caracteres.');
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      await this.mostrarAlerta('No coinciden', 'La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (this.passwordNueva === this.passwordActual) {
      await this.mostrarAlerta('Sin cambios', 'La nueva contraseña es igual a la actual.');
      return;
    }

    this.cambiando = true;
    try {
      // Verificamos la contraseña actual reutilizando la validación del login.
      const usuario = await this.dbService.validarUsuario(this.email, this.passwordActual);
      if (!usuario) {
        await this.mostrarAlerta('Contraseña incorrecta', 'La contraseña actual no es correcta.');
        return;
      }

      await this.dbService.cambiarPassword(this.id, this.passwordNueva);
      this.passwordActual = '';
      this.passwordNueva = '';
      this.passwordConfirmar = '';
      await this.mostrarAlerta('Listo', 'Tu contraseña fue actualizada.');
    } catch (e) {
      await this.mostrarAlerta('Error', 'No se pudo cambiar la contraseña.');
    } finally {
      this.cambiando = false;
    }
  }

  async cerrarSesion() {
    const alerta = await this.alertController.create({
      header: 'Cerrar sesión',
      message: '¿Seguro que quieres salir?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          role: 'destructive',
          handler: () => {
            localStorage.removeItem('sesion');
            this.router.navigate(['/login']);
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
