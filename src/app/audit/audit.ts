import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, AuditEvent } from '../services/audit.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
})
export class Audit {
  private auditService = inject(AuditService);

  events = signal<AuditEvent[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  searched = signal(false);

  bookingId = '';
  actorId = '';

  search(): void {
    if (!this.bookingId && !this.actorId) {
      this.error.set('Ingresa un ID de reserva o de usuario para buscar.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auditService.getEvents(this.bookingId || undefined, this.actorId || undefined).subscribe({
      next: (data) => {
        this.events.set(data);
        this.loading.set(false);
        this.searched.set(true);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al conectar con la API');
        this.loading.set(false);
      },
    });
  }
}
