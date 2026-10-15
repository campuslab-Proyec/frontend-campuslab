import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Booking {
  id?: number;
  resourceId: string;
  studentId: string;
  status?: string;
  from: string;
  to: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private baseUrl = environment.bffUrl; // Apunta a 'http://localhost:8080/api/bff'

  constructor(private http: HttpClient) {}

  getAll(status?: string, from?: string, to?: string): Observable<Booking[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Booking[]>(`${this.baseUrl}/bookings`, { params });
  }

  getById(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.baseUrl}/bookings/${id}`);
  }

  create(booking: Booking): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings`, booking);
  }

  updateStatus(id: number, status: string): Observable<Booking> {
    return this.http.put<Booking>(`${this.baseUrl}/bookings/${id}/status`, { status });
  }
}
