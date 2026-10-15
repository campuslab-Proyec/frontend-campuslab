import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CurrentUser {
  name: string;
  username: string;
  roles: string[];
}

/**
 * Roles del usuario según los App Roles de ms-campuslab-bff (Admin, Docente, Estudiante).
 * Vienen en el access token del BFF, por eso se piden a /api/bff/me en vez de leer el ID token.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private request$?: Observable<CurrentUser | null>;

  readonly user = signal<CurrentUser | null>(null);
  readonly roles = computed(() => this.user()?.roles ?? []);
  readonly isAdmin = computed(() => this.roles().includes('Admin'));
  readonly canManageBookings = computed(() => this.isAdmin() || this.roles().includes('Docente'));

  load(): Observable<CurrentUser | null> {
    this.request$ ??= this.http.get<CurrentUser>(`${environment.bffUrl}/me`).pipe(
      tap((user) => this.user.set(user)),
      catchError(() => of(null)),
      shareReplay(1),
    );
    return this.request$;
  }

  hasRole(role: string): Observable<boolean> {
    return this.load().pipe(map((user) => !!user?.roles.includes(role)));
  }
}
