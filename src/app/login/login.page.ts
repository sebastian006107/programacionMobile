import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  usuario: string = '';
  password: string = '';

  constructor() { }

  ngOnInit() {
  }

  login() {
    if (this.usuario && this.password) {
      alert('Bienvenido');
    } else {
      alert('Completa los campos');
    }
  }

}