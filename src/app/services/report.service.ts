import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KpiResponse {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  avgCycleTimeMinutes: number;
}

export interface TopResourceDto {
  resourceId: string;
  totalBookings: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private baseUrl = environment.bffUrl; // Apunta a 'http://localhost:8080/api/bff'

  constructor(private http: HttpClient) {}

  getKpis(range: string): Observable<KpiResponse> {
    return this.http.get<KpiResponse>(`${this.baseUrl}/report/kpis?range=${range}`);
  }

  getTopResources(range: string): Observable<TopResourceDto[]> {
    return this.http.get<TopResourceDto[]>(`${this.baseUrl}/report/top-resources?range=${range}`);
  }
}
