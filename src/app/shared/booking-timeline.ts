import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BookingHistoryEvent } from '../services/bookings.service';
import { BookingStatus, FLOW, STATUS_META, StatusMeta } from './booking-status';

interface Step {
  status: BookingStatus;
  meta: StatusMeta;
  state: 'done' | 'current' | 'pending' | 'cancelled';
  event?: BookingHistoryEvent;
}

/**
 * Línea de tiempo del ciclo de vida de una reserva. Marca los pasos completados según el estado
 * actual y, si hay historial de auditoría, muestra cuándo y con qué rol ocurrió cada paso.
 */
@Component({
  selector: 'app-booking-timeline',
  standalone: true,
  imports: [DatePipe],
  template: `
    <ol class="timeline">
      @for (step of steps(); track step.status) {
        <li class="tl-item" [class]="'tl-item ' + step.state">
          <span class="tl-dot"><i class="bi" [class]="'bi ' + (step.state === 'pending' ? 'bi-circle' : step.meta.icon)"></i></span>
          <div class="tl-body">
            <div class="tl-title">{{ step.meta.label }}</div>
            @if (step.event) {
              <div class="tl-meta">
                {{ step.event.timestamp | date: 'dd/MM/yyyy HH:mm' }}
                @if (step.event.actorRole && step.event.actorRole !== 'UNKNOWN') {
                  · {{ step.event.actorRole }}
                }
              </div>
            } @else if (step.state === 'current') {
              <div class="tl-meta">Estado actual</div>
            } @else if (step.state === 'pending') {
              <div class="tl-meta">Pendiente</div>
            }
          </div>
        </li>
      }
    </ol>
  `,
  styles: [`
    .timeline { list-style: none; margin: 0; padding: 0; position: relative; }
    .tl-item { position: relative; display: flex; gap: 0.9rem; padding-bottom: 1.15rem; }
    .tl-item:last-child { padding-bottom: 0; }
    .tl-item:not(:last-child)::after {
      content: ''; position: absolute; left: 15px; top: 32px; bottom: 2px; width: 2px; background: var(--border);
    }
    .tl-item.done:not(:last-child)::after { background: var(--success); }
    .tl-dot {
      width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
      background: var(--surface-hover); color: var(--text-soft); font-size: 0.95rem; border: 2px solid var(--border);
    }
    .tl-item.done .tl-dot { background: var(--success-soft); color: var(--success); border-color: var(--success); }
    .tl-item.current .tl-dot { background: var(--primary); color: var(--primary-contrast); border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); }
    .tl-item.cancelled .tl-dot { background: var(--danger-soft); color: var(--danger); border-color: var(--danger); }
    .tl-title { font-weight: 600; font-size: 0.9rem; line-height: 32px; height: 32px; }
    .tl-item.pending .tl-title { color: var(--text-soft); }
    .tl-meta { font-size: 0.77rem; color: var(--text-muted); margin-top: -4px; }
  `],
})
export class BookingTimeline {
  readonly status = input<string | null | undefined>();
  readonly events = input<BookingHistoryEvent[]>([]);

  protected steps = computed<Step[]>(() => {
    const status = this.status() as BookingStatus;
    // Primer evento de cada acción (el backend los devuelve del más nuevo al más antiguo)
    const byAction = new Map<string, BookingHistoryEvent>();
    [...this.events()].reverse().forEach((e) => {
      if (!byAction.has(e.action)) byAction.set(e.action, e);
    });

    if (status === 'CANCELADA') {
      const reached = FLOW.filter((s, i) => i === 0 || byAction.has(s));
      return [
        ...reached.map((s) => ({ status: s, meta: STATUS_META[s], state: 'done' as const, event: byAction.get(s) })),
        { status: 'CANCELADA', meta: STATUS_META.CANCELADA, state: 'cancelled', event: byAction.get('CANCELADA') },
      ];
    }

    const current = Math.max(FLOW.indexOf(status), 0);
    return FLOW.map((s, i) => ({
      status: s,
      meta: STATUS_META[s],
      state: i < current || (i === current && s === 'DEVUELTA') ? 'done' : i === current ? 'current' : 'pending',
      event: byAction.get(s),
    }));
  });
}
