import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { DbserviceService } from '../services/dbservice.service';
import { Usuario } from '../models/usuario';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: false,
})
export class RegistroPage implements OnInit {
  nombre: string = '';
  email: string = '';
  password: string = '';
  confirmar: string = '';
  guardando: boolean = false;

  constructor(
    private dbService: DbserviceService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  async crearCuenta() {
    const nombre = this.nombre.trim();
    const email = this.email.trim().toLowerCase();

    if (!nombre || !email || !this.password || !this.confirmar) {
      await this.mostrarAlerta('Faltan datos', 'Completa todos los campos.');
      return;
    }
    if (!this.emailValido(email)) {
      await this.mostrarAlerta('Email inválido', 'Ingresa un email con formato válido.');
      return;
    }
    if (this.password.length < 4) {
      await this.mostrarAlerta('Contraseña corta', 'Debe tener al menos 4 caracteres.');
      return;
    }
    if (this.password !== this.confirmar) {
      await this.mostrarAlerta('No coinciden', 'La contraseña y su confirmación no coinciden.');
      return;
    }

    this.guardando = true;
    try {
      const usuario: Usuario = { nombre, email, password: this.password };
      const creado = await this.dbService.registrarUsuario(usuario);

      if (!creado) {
        await this.mostrarAlerta('Email en uso', 'Ya existe una cuenta con ese email.');
        return;
      }

      // Cuenta creada: iniciamos sesión automáticamente (misma clave que usa el login).
      localStorage.setItem(
        'sesion',
        JSON.stringify({ id: creado.id, nombre: creado.nombre, email: creado.email })
      );
      this.limpiar();
      this.router.navigate(['/home']);
    } catch (e) {
      await this.mostrarAlerta('Error', 'No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      this.guardando = false;
    }
  }

  irLogin() {
    this.router.navigate(['/login']);
  }

  private emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private limpiar() {
    this.nombre = '';
    this.email = '';
    this.password = '';
    this.confirmar = '';
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
