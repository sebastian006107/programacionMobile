import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, tap } from 'rxjs';

import { Indicadores } from '../models/indicador';

// Consume la API pública de mindicador.cl (Banco Central de Chile).
// No requiere API key ni registro.
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly API_URL = 'https://mindicador.cl/api';
  // Clave en LocalStorage para el último resultado exitoso de la API.
  // Permite mostrar valores guardados cuando no hay internet (código 404/red caída).
  private readonly CACHE_KEY = 'indicadores_cache';

  constructor(private http: HttpClient) {}

  // --- CONSULTA ASÍNCRONA ---
  // Devuelve un Observable; la página se suscribe con .subscribe().
  // Trae todos los indicadores del día y, de paso, los guarda en caché.
  obtenerIndicadores(): Observable<Indicadores> {
    return this.http
      .get<Indicadores>(this.API_URL)
      .pipe(tap((datos) => this.guardarCache(datos)));
  }

  // --- CONSULTA SÍNCRONA ---
  // Misma llamada, pero con async/await: espera el resultado antes de seguir.
  // Se usa para calcular la conversión solo cuando el valor ya llegó.
  async obtenerIndicadoresAsync(): Promise<Indicadores> {
    const datos = await firstValueFrom(this.http.get<Indicadores>(this.API_URL));
    this.guardarCache(datos);
    return datos;
  }

  // Conversión de moneda (síncrona): total en CLP -> moneda destino.
  // Fórmula: total_USD = total_CLP / valor_dolar
  // Si la API no responde, cae de vuelta al último valor guardado en caché.
  async convertirTotal(totalCLP: number, moneda: 'dolar' | 'euro'): Promise<number> {
    let indicadores: Indicadores;
    try {
      indicadores = await this.obtenerIndicadoresAsync();
    } catch (e) {
      const cache = this.leerCache();
      if (!cache) {
        throw e; // Sin internet y sin datos previos: no hay nada que mostrar.
      }
      indicadores = cache;
    }
    const valor = indicadores[moneda].valor;
    return totalCLP / valor;
  }

  // --- PERSISTENCIA OFFLINE ---
  // Guarda el último resultado exitoso de la API en LocalStorage.
  private guardarCache(datos: Indicadores): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(datos));
  }

  // Lee el último resultado guardado (o null si nunca se ha consultado con éxito).
  leerCache(): Indicadores | null {
    const raw = localStorage.getItem(this.CACHE_KEY);
    return raw ? (JSON.parse(raw) as Indicadores) : null;
  }
}
