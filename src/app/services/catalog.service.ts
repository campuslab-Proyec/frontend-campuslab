import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Resource {
  id?: number;
  code: string;
  name: string;
  category: string;
  stock: number;
  description?: string;
  isAvailable?: boolean;
}

export interface Laboratory {
  id?: number;
  code: string;
  name: string;
  location: string;
  capacity: number;
  description?: string;
  isAvailable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private baseUrl = environment.bffUrl;

  constructor(private http: HttpClient) { }

  // Métodos para Laboratorios
  getLaboratories(): Observable<Laboratory[]> {
    return this.http.get<Laboratory[]>(`${this.baseUrl}/catalog/labs`);
  }

  createLaboratory(laboratory: Laboratory): Observable<Laboratory> {
    return this.http.post<Laboratory>(`${this.baseUrl}/catalog/labs`, laboratory);
  }

  // Métodos para Recursos
  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.baseUrl}/catalog/resources`);
  }

  createResource(resource: Resource): Observable<Resource> {
    return this.http.post<Resource>(`${this.baseUrl}/catalog/resources`, resource);
  }
}