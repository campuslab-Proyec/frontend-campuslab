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
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private baseUrl = environment.bffUrl; // Apunta a 'http://localhost:8080/api/bff'

  constructor(private http: HttpClient) { }

  // Métodos para Laboratorios
  getLaboratories(): Observable<Laboratory[]> {
    return this.http.get<Laboratory[]>(`${this.baseUrl}/laboratories`);
  }

  createLaboratory(laboratory: Laboratory): Observable<Laboratory> {
    return this.http.post<Laboratory>(`${this.baseUrl}/laboratories`, laboratory);
  }

  // Métodos para Recursos
  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.baseUrl}/resources`);
  }

  createResource(resource: Resource): Observable<Resource> {
    return this.http.post<Resource>(`${this.baseUrl}/resources`, resource);
  }
}