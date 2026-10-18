import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Booking, BookingHistoryEvent, BookingsService } from '../services/bookings.service';
import { UserService } from '../services/user.service';
import { CatalogLookupService } from '../services/catalog-lookup.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';
import { StatusBadge } from '../shared/status-badge';
import { BookingTimeline } from '../shared/booking-timeline';
import { WeekCalendar } from '../shared/week-calendar';
import {
  ACTION_LABEL, ALL_STATUSES, BookingStatus, STATUS_META, isFinal, nextStatuses, statusMeta,
} from '../shared/booking-status';

type View = 'list' | 'calendar';
type Sort = 'recent' | 'upcoming';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [DatePipe, FormsModule, StatusBadge, BookingTimeline, WeekCalendar],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
})
export class Bookings implements OnInit {
  private bookingsService = inject(BookingsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  protected userService = inject(UserService);
  protected lookup = inject(CatalogLookupService);

  protected readonly statuses = ALL_STATUSES;
  protected readonly statusMeta = STATUS_META;
  protected readonly actionLabel = ACTION_LABEL;

  protected bookings = signal<Booking[]>([]);
  protected loading = signal(true);
  protected busyId = signal<number | null>(null);

  // ---- filtros y vista ----
  protected view = signal<View>('list');
  protected statusFilter = signal<string>('');
  protected search = signal('');
  protected onlyMine = signal(false);
  protected sort = signal<Sort>('recent');

  // ---- formulario ----
  protected showForm = signal(false);
  protected submitted = signal(false);
  protected saving = signal(false);
  protected form = { resourceId: '', studentId: '', from: '', to: '' };

  // ---- detalle ----
  protected selected = signal<Booking | null>(null);
  protected history = signal<BookingHistoryEvent[]>([]);
  protected historyLoading = signal(false);

  private username = computed(() => (this.userService.user()?.username ?? '').toLowerCase());

  /** Aplica "mis reservas" y la búsqueda (sin el filtro de estado, para contar por estado). */
  private scoped = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.bookings().filter((b) => {
      if (this.onlyMine() && (b.studentId ?? '').toLowerCase() !== this.username()) return false;
      if (!term) return true;
      return [String(b.id), b.resourceId, this.lookup.name(b.resourceId), b.studentId]
        .some((v) => (v ?? '').toLowerCase().includes(term));
    });
  });

  protected counts = computed(() => {
    const map: Record<string, number> = { '': this.scoped().length };
    ALL_STATUSES.forEach((s) => (map[s] = this.scoped().filter((b) => b.status === s).length));
    return map;
  });

  protected filtered = computed(() => {
    const list = this.statusFilter()
      ? this.scoped().filter((b) => b.status === this.statusFilter())
      : [...this.scoped()];
    if (this.sort() === 'upcoming') {
      return list.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
    }
    return list.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  });

  /** El formulario usa ngModel (objeto mutable); este contador fuerza el recálculo de conflicts. */
  protected formVersion = signal(0);

  /** Reservas activas del mismo recurso que se solapan con el horario del formulario. */
  protected conflicts = computed(() => {
    void this.formVersion();
    const { resourceId, from, to } = this.form;
    if (!resourceId || !from || !to) return [];
    const start = new Date(from).getTime();
    const end = new Date(to).getTime();
    return this.bookings().filter(
      (b) => b.resourceId === resourceId && !isFinal(b.status)
        && new Date(b.from).getTime() < end && new Date(b.to).getTime() > start,
    );
  });

  ngOnInit(): void {
    this.lookup.load();
    this.onlyMine.set(this.userService.isStudent());
    this.resetForm();

    const params = this.route.snapshot.queryParamMap;
    if (params.get('status')) this.statusFilter.set(params.get('status')!);
    if (params.get('new') || params.get('resource')) {
      this.showForm.set(true);
      this.form.resourceId = params.get('resource') ?? '';
    }
    this.load(params.get('id') ? Number(params.get('id')) : undefined);
  }

  load(openId?: number): void {
    this.loading.set(true);
    this.bookingsService.getAll().subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.loading.set(false);
        if (openId) {
          const found = data.find((b) => b.id === openId);
          if (found) this.open(found);
        } else if (this.selected()) {
          // Mantiene el panel de detalle actualizado tras un cambio de estado
          const fresh = data.find((b) => b.id === this.selected()!.id);
          this.selected.set(fresh ?? null);
        }
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las reservas', apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  // ================= FORMULARIO =================

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.submitted.set(false);
  }

  onFormChange(): void {
    this.formVersion.update((v) => v + 1);
  }

  /** Errores de validación del formulario (se muestran después del primer intento de envío). */
  protected formErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    const f = this.form;
    if (!f.resourceId) errors['resourceId'] = 'Selecciona un laboratorio o recurso';
    if (!f.studentId.trim()) errors['studentId'] = 'Indica el estudiante';
    if (!f.from) errors['from'] = 'Indica la fecha de inicio';
    if (!f.to) errors['to'] = 'Indica la fecha de término';
    if (f.from && new Date(f.from).getTime() < Date.now() - 60_000) errors['from'] = 'La fecha de inicio ya pasó';
    if (f.from && f.to && new Date(f.to) <= new Date(f.from)) errors['to'] = 'Debe ser posterior al inicio';
    if (f.from && f.to && new Date(f.to).getTime() - new Date(f.from).getTime() > 12 * 3_600_000) {
      errors['to'] = 'Una reserva no puede durar más de 12 horas';
    }
    return errors;
  }

  createBooking(): void {
    this.submitted.set(true);
    if (Object.keys(this.formErrors()).length) return;

    this.saving.set(true);
    const payload: Booking = { ...this.form, studentId: this.form.studentId.trim() };
    this.bookingsService.create(payload).subscribe({
      next: (created) => {
        this.toast.success('Reserva solicitada', `${this.lookup.name(created.resourceId)} · queda pendiente de aprobación`);
        this.saving.set(false);
        this.submitted.set(false);
        this.showForm.set(false);
        this.resetForm();
        this.load();
      },
      error: (err) => {
        this.toast.error('No se pudo crear la reserva', apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private resetForm(): void {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 2 * 3_600_000);
    this.form = {
      resourceId: '',
      studentId: this.userService.isStudent() ? (this.userService.user()?.username ?? '') : '',
      from: toLocalInput(start),
      to: toLocalInput(end),
    };
    this.onFormChange();
  }

  // ================= ACCIONES =================

  protected actionsFor(b: Booking): BookingStatus[] {
    return this.userService.canManageBookings() ? nextStatuses(b.status) : [];
  }

  async changeStatus(booking: Booking, status: BookingStatus): Promise<void> {
    if (!booking.id) return;
    const action = ACTION_LABEL[status];
    const ok = await this.confirm.ask({
      title: `${action.text}: reserva #${booking.id}`,
      message: `${this.lookup.name(booking.resourceId)} pasará de "${STATUS_META[booking.status as BookingStatus]?.label}" a "${STATUS_META[status].label}". Se notificará al estudiante.`,
      confirmText: action.text,
      cancelText: 'Volver',
      tone: status === 'CANCELADA' ? 'danger' : 'primary',
      icon: STATUS_META[status].icon,
    });
    if (!ok) return;

    this.busyId.set(booking.id);
    this.bookingsService.updateStatus(booking.id, status).subscribe({
      next: () => {
        this.toast.success(`Reserva #${booking.id}: ${STATUS_META[status].label}`, 'Evento publicado en RabbitMQ');
        this.busyId.set(null);
        this.load();
        if (this.selected()?.id === booking.id) this.loadHistory(booking.id!);
      },
      error: (err) => {
        this.toast.error('No se pudo cambiar el estado', apiErrorMessage(err));
        this.busyId.set(null);
      },
    });
  }

  // ================= DETALLE =================

  open(booking: Booking): void {
    this.selected.set(booking);
    if (booking.id) this.loadHistory(booking.id);
  }

  close(): void {
    this.selected.set(null);
    // Quita ?id= de la URL para que recargar no vuelva a abrir el panel
    this.router.navigate([], { queryParams: { id: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private loadHistory(id: number): void {
    this.historyLoading.set(true);
    this.history.set([]);
    this.bookingsService.history(id).subscribe({
      next: (events) => {
        this.history.set(events);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false), // la línea de tiempo funciona igual sin fechas
    });
  }

  protected label(status?: string): string {
    return statusMeta(status).label;
  }

  protected durationHours(b: Booking): number {
    return Math.round(((new Date(b.to).getTime() - new Date(b.from).getTime()) / 3_600_000) * 10) / 10;
  }
}

/** Date -> "yyyy-MM-ddTHH:mm" en hora local (formato de <input type="datetime-local">). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
