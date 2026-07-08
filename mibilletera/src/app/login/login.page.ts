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

    const usuario = await this.dbService.validarUsuario(this.email.trim(), this.password);

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
