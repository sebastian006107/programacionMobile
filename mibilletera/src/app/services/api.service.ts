import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

import { Indicador, Indicadores } from '../models/indicador';

// Consume la API pública de mindicador.cl (Banco Central de Chile).
// No requiere API key ni registro.
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly API_URL = 'https://mindicador.cl/api';

  constructor(private http: HttpClient) {}

  // --- CONSULTA ASÍNCRONA ---
  // Devuelve un Observable; la página se suscribe con .subscribe().
  // Trae todos los indicadores del día.
  obtenerIndicadores(): Observable<Indicadores> {
    return this.http.get<Indicadores>(this.API_URL);
  }

  // --- CONSULTA SÍNCRONA ---
  // Misma llamada, pero con async/await: espera el resultado antes de seguir.
  // Se usa para calcular la conversión solo cuando el valor ya llegó.
  async obtenerIndicadoresAsync(): Promise<Indicadores> {
    return await firstValueFrom(this.http.get<Indicadores>(this.API_URL));
  }

  // Histórico de un indicador puntual: /api/dolar, /api/euro, /api/uf ...
  obtenerIndicador(codigo: string): Observable<Indicador> {
    return this.http.get<Indicador>(`${this.API_URL}/${codigo}`);
  }

  // Conversión de moneda (síncrona): total en CLP -> moneda destino.
  // Fórmula: total_USD = total_CLP / valor_dolar
  async convertirTotal(totalCLP: number, moneda: 'dolar' | 'euro'): Promise<number> {
    const indicadores = await this.obtenerIndicadoresAsync();
    const valor = indicadores[moneda].valor;
    return totalCLP / valor;
  }
}
