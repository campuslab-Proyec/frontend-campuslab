import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private baseUrl = environment.bffUrl; // Apunta a 'http://localhost:8080/api/bff'

  constructor(private http: HttpClient) {}

  getEvents(bookingId?: string, actorId?: string): Observable<AuditEvent[]> {
    let url = `${this.baseUrl}/audit/events`;
    const params: string[] = [];
    if (bookingId) params.push(`bookingId=${bookingId}`);
    if (actorId) params.push(`actorId=${actorId}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<AuditEvent[]>(url);
  }
}
