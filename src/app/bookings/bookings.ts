import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Booking {
    id: string;
    labName: string;
    status: string;
}

@Component({
    selector: 'app-bookings',
    standalone: true,
    template: `
        <div style="padding: 20px;">
            <h2>Gestión de Reservas</h2>
            @if (loading()) {
                <p>Cargando reservas desde la API...</p>
            } @else if (error()) {
                <p style="color: red;">Error: {{ error() }}</p>
            } @else {
                <ul>
                    @for (item of bookings(); track item.id) {
                        <li><strong>{{ item.labName }}</strong> - Estado: {{ item.status }}</li>
                    }
                </ul>
            }
        </div>
    `
})
export class Bookings implements OnInit {
    private http = inject(HttpClient);
    bookings = signal<Booking[]>([]);
    loading = signal<boolean>(true);
    error = signal<string | null>(null);

    ngOnInit(): void {
        // MsalInterceptor adjunta automáticamente la cabecera Authorization: Bearer <token>
        this.http.get<Booking[]>('http://localhost:8080/api/bookings')
            .subscribe({
                next: (data) => {
                    this.bookings.set(data);
                    this.loading.set(false);
                },
                error: (err) => {
                    this.error.set(err?.message ?? 'Error al conectar con la API');
                    this.loading.set(false);
                }
            });
    }
}