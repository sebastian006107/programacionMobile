import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: false,
})
export class NotFoundPage implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {}

  irHome() {
    this.router.navigate(['/home']);
  }
}
