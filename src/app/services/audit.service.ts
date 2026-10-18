import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditEvent {
  id: number;
  bookingId: string;
  action: string;
  actorId: string;
  actorRole: string;
  timestamp: string;
  detail?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private baseUrl = environment.bffUrl;

  constructor(private http: HttpClient) {}

  getEvents(bookingId?: string, actorId?: string): Observable<AuditEvent[]> {
    let params = new HttpParams();
    if (bookingId) params = params.set('bookingId', bookingId);
    if (actorId) params = params.set('actorId', actorId);
    return this.http.get<AuditEvent[]>(`${this.baseUrl}/audit/events`, { params });
  }
}
