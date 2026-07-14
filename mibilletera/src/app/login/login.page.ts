import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { DbserviceService } from '../services/dbservice.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';
  ingresando: boolean = false;

  constructor(
    private dbService: DbserviceService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  async ingresar() {
    if (!this.email.trim() || !this.password.trim()) {
      await this.mostrarAlerta('Faltan datos', 'Ingresa tu email y contraseña.');
      return;
    }

    this.ingresando = true;
    try {
      // El servicio espera a que la base de datos esté lista y normaliza el email,
      // así que no importa si el usuario lo escribe con mayúsculas.
      const usuario = await this.dbService.validarUsuario(this.email, this.password);

      if (usuario) {
        // Guarda la sesión en LocalStorage (datos pequeños y sueltos).
        localStorage.setItem(
          'sesion',
          JSON.stringify({ id: usuario.id, nombre: usuario.nombre, email: usuario.email })
        );
        // Limpia el formulario y entra a home.
        this.email = '';
        this.password = '';
        this.router.navigate(['/home']);
      } else {
        await this.mostrarAlerta('Error', 'Email o contraseña incorrectos.');
      }
    } catch (e) {
      // La base de datos no llegó a abrirse (esperarBD agota su tiempo).
      await this.mostrarAlerta(
        'Error',
        'No se pudo acceder a la base de datos. Vuelve a intentarlo.'
      );
    } finally {
      this.ingresando = false;
    }
  }

  irRegistro() {
    this.router.navigate(['/registro']);
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
