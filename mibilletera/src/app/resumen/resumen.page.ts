import { Component, OnInit } from '@angular/core';

import { DbserviceService } from '../services/dbservice.service';
import { ResumenCategoria } from '../models/resumen-categoria';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  styleUrls: ['./resumen.page.scss'],
  standalone: false,
})
export class ResumenPage implements OnInit {
  resumen: ResumenCategoria[] = [];
  total: number = 0;

  constructor(private dbService: DbserviceService) {}

  ngOnInit() {
    // Cada vez que cambian los gastos, recalculamos el resumen.
    this.dbService.fetchGastos().subscribe(() => this.cargar());
  }

  async cargar() {
    try {
      this.resumen = await this.dbService.resumenPorCategoria();
      this.total = this.resumen.reduce((suma, r) => suma + r.total, 0);
    } catch (e) {
      // La base de datos aún no está lista; se recargará cuando emita el observable.
    }
  }

  // Categorías que efectivamente tienen gastos
  get conGastos(): ResumenCategoria[] {
    return this.resumen.filter((r) => r.cantidad > 0);
  }

  // Proporción del total (0 a 1), para la barra de progreso
  proporcion(r: ResumenCategoria): number {
    return this.total > 0 ? r.total / this.total : 0;
  }

  porcentaje(r: ResumenCategoria): number {
    return this.proporcion(r) * 100;
  }

  // Categoría en la que más se gastó
  get mayor(): ResumenCategoria | null {
    const items = this.conGastos;
    return items.length > 0 ? items[0] : null;
  }
}
