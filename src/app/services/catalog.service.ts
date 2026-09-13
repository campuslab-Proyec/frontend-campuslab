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
  description: string;
  isAvailable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  private apiUrl = `${environment.bffUrl}/catalog/resources`;

  constructor(private http: HttpClient) { }

  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(this.apiUrl);
  }

  createResource(resource: Resource): Observable<Resource> {
    return this.http.post<Resource>(this.apiUrl, resource);
  }
}