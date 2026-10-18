import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { ToastService, apiErrorMessage } from '../services/toast.service';

interface QueueRow {
  queue: string;
  messages: number;
  consumers: number;
  dlq: boolean;
}

/** Demos de las guías del curso: routing keys (guía 2) y reintentos + DLX/DLQ (guía 3). */
@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Alertas y guías</h1>
        <p class="page-subtitle">Demostraciones de las guías de RabbitMQ: enrutamiento por routing key, reintentos y dead-letter queues.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-ghost" routerLink="/rabbit"><i class="bi bi-diagram-3"></i> Ir al panel RabbitMQ</a>
      </div>
    </div>

    @if (!backendOk()) {
      <div class="alert-x tone-neutral"><i class="bi bi-wifi-off"></i><div>Sin conexión con el backend.</div></div>
    } @else if (totalDead() > 0) {
      <div class="alert-x tone-danger"><i class="bi bi-exclamation-octagon"></i><div><b>{{ totalDead() }} mensaje(s) en DLQ.</b> Son órdenes que fallaron después de 3 intentos.</div></div>
    } @else {
      <div class="alert-x tone-success"><i class="bi bi-check-circle"></i><div>Sin mensajes en las DLQ.</div></div>
    }

    <div class="grid grid-2 mb-4">
      <div class="card-x">
        <div class="card-x-header">
          <h3 class="card-x-title"><i class="bi bi-signpost-split"></i> Guía 2 · Routing keys</h3>
          <span class="tag tone-violet">DirectExchange</span>
        </div>
        <div class="card-x-body">
          <p class="muted small">Cada log se publica en <span class="mono">demo.logs.exchange</span> con su nivel como routing key. <b>demo.logs.all</b> recibe todos; <b>demo.logs.errors</b> solo los ERROR.</p>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-soft-primary" (click)="sendLog('INFO', 'El usuario ha iniciado sesión')"><i class="bi bi-info-circle"></i> Log INFO</button>
            <button class="btn btn-soft-warning" (click)="sendLog('WARNING', 'Uso de CPU al 85%')"><i class="bi bi-exclamation-triangle"></i> Log WARNING</button>
            <button class="btn btn-soft-danger" (click)="sendLog('ERROR', 'No se pudo conectar a la base de datos')"><i class="bi bi-x-octagon"></i> Log ERROR</button>
          </div>
        </div>
      </div>

      <div class="card-x">
        <div class="card-x-header">
          <h3 class="card-x-title"><i class="bi bi-arrow-repeat"></i> Guía 3 · Reintentos, DLX y DLQ</h3>
          <span class="tag tone-warning">3 intentos · 1s/2s/4s</span>
        </div>
        <div class="card-x-body">
          <p class="muted small">Una orden que falla se reintenta con backoff exponencial y, al agotarse los intentos, se rechaza sin reencolar y llega a <b>demo.orders.dlq</b>.</p>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-soft-success" (click)="sendOrder(false)"><i class="bi bi-check-lg"></i> Orden correcta</button>
            <button class="btn btn-soft-danger" (click)="sendOrder(true)" [disabled]="waiting()">
              @if (waiting()) { <span class="spinner-border spinner-border-sm"></span> Reintentando… } @else { <i class="bi bi-bug"></i> Orden que falla (→ DLQ) }
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card-x">
      <div class="card-x-header">
        <h3 class="card-x-title"><i class="bi bi-inboxes"></i> Colas monitoreadas</h3>
        <span class="muted small"><span class="pulse-dot"></span> Actualizado {{ updated() }} · cada 3 s</span>
      </div>
      <div class="table-wrap">
        <table class="table-x">
          <thead><tr><th>Cola</th><th class="text-end">Mensajes</th><th class="text-end">Consumidores</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.queue) {
              <tr>
                <td>
                  <span class="mono fw-semibold">{{ r.queue }}</span>
                  @if (r.dlq) { <span class="tag tone-danger ms-2">DLQ</span> }
                </td>
                <td class="text-end">
                  <span class="tag" [class.tone-danger]="r.dlq && r.messages > 0" [class.tone-neutral]="!(r.dlq && r.messages > 0)">{{ r.messages }}</span>
                </td>
                <td class="text-end">{{ r.consumers }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class Alerts {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private base = `${environment.bffUrl}/alerts`;

  rows = signal<QueueRow[]>([]);
  backendOk = signal(true);
  updated = signal('-');
  waiting = signal(false);
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
    this.http.post(`${this.base}/demo/logs`, { level, message }).subscribe({
      next: () => {
        this.toast.info(`Log ${level} enviado`, `routing key: ${level}`);
        this.refresh();
      },
      error: (err) => this.toast.error('No se pudo enviar el log', apiErrorMessage(err)),
    });
  }

  sendOrder(fail: boolean) {
    const orderId = `ORD-${Date.now()}`;
    if (fail) this.waiting.set(true);
    this.http
      .post(`${this.base}/demo/orders`, { orderId, customer: 'Cliente demo', fail })
      .subscribe({
        next: () => {
          this.toast.info(fail ? 'Orden con error enviada' : 'Orden enviada', fail ? 'Se reintentará 3 veces antes de ir a la DLQ' : orderId);
          // espera a los reintentos (1s+2s+4s) antes de refrescar
          setTimeout(() => {
            this.refresh();
            this.waiting.set(false);
          }, fail ? 8000 : 500);
        },
        error: (err) => {
          this.waiting.set(false);
          this.toast.error('No se pudo enviar la orden', apiErrorMessage(err));
        },
      });
  }
}
