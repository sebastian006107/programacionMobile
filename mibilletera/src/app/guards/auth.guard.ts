import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

// Protege las rutas privadas. Lee la sesión desde LocalStorage;
// si no hay sesión, redirige a login y retorna false.
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const sesion = localStorage.getItem('sesion');
    if (sesion) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
