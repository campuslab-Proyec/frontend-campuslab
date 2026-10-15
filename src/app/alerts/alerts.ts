import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface QueueRow {
  queue: string;
  messages: number;
  consumers: number;
  dlq: boolean;
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  template: `
    <div class="container py-4">
      <h2>Alertas y colas (RabbitMQ)</h2>

      @if (backendOk()) {
        @if (totalDead() > 0) {
          <div class="alert alert-danger">⚠ {{ totalDead() }} mensaje(s) en colas DLQ. Revisa los fallos.</div>
        } @else {
          <div class="alert alert-success">✓ Sin mensajes en DLQ</div>
        }
      } @else {
        <div class="alert alert-secondary">Sin conexión con el backend</div>
      }

      <div class="card mb-3">
        <div class="card-body">
          <h5>Guía 2: routing keys (DirectExchange)</h5>
          <button class="btn btn-primary me-2" (click)="sendLog('INFO', 'El usuario ha iniciado sesión')">Log INFO</button>
          <button class="btn btn-warning me-2" (click)="sendLog('WARNING', 'Uso de CPU al 85%')">Log WARNING</button>
          <button class="btn btn-danger" (click)="sendLog('ERROR', 'No se pudo conectar a la base de datos')">Log ERROR</button>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <h5>Guía 3: reintentos, DLX y DLQ</h5>
          <button class="btn btn-success me-2" (click)="sendOrder(false)">Orden correcta</button>
          <button class="btn btn-outline-danger" (click)="sendOrder(true)">Orden que falla (→ DLQ)</button>
        </div>
      </div>

      <table class="table table-sm align-middle">
        <thead>
          <tr><th>Cola</th><th>Mensajes</th><th>Consumidores</th></tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.queue) {
            <tr>
              <td>{{ r.queue }}</td>
              <td>
                <span class="badge" [class.bg-danger]="r.dlq && r.messages > 0" [class.bg-secondary]="!(r.dlq && r.messages > 0)">
                  {{ r.messages }}
                </span>
              </td>
              <td>{{ r.consumers }}</td>
            </tr>
          }
        </tbody>
      </table>
      <small class="text-muted">Actualizado: {{ updated() }} (cada 3 s)</small>
    </div>
  `,
})
export class Alerts {
  private http = inject(HttpClient);
  private base = `${environment.bffUrl}/alerts`;

  rows = signal<QueueRow[]>([]);
  backendOk = signal(true);
  updated = signal('-');
  totalDead = computed(() =>
    this.rows().filter(r => r.dlq && r.messages > 0).reduce((sum, r) => sum + r.messages, 0)
  );

  constructor() {
    this.refresh();
    const timer = setInterval(() => this.refresh(), 3000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  refresh() {
    this.http.get<QueueRow[]>(`${this.base}/dlq`).subscribe({
      next: data => {
        this.rows.set(data);
        this.backendOk.set(true);
        this.updated.set(new Date().toLocaleTimeString());
      },
      error: () => this.backendOk.set(false),
    });
  }

  sendLog(level: string, message: string) {
    this.http.post(`${this.base}/demo/logs`, { level, message }).subscribe(() => this.refresh());
  }

  sendOrder(fail: boolean) {
    const orderId = `ORD-${Date.now()}`;
    this.http
      .post(`${this.base}/demo/orders`, { orderId, customer: 'Cliente demo', fail })
      .subscribe(() => setTimeout(() => this.refresh(), 8000)); // espera a los reintentos (1s+2s+4s)
  }
}