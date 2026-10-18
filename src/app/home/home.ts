import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Booking, BookingsService } from '../services/bookings.service';
import { UserService } from '../services/user.service';
import { CatalogLookupService } from '../services/catalog-lookup.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';
import { StatusBadge } from '../shared/status-badge';
import { ALL_STATUSES, BookingStatus, STATUS_META, isActive, isFinal } from '../shared/booking-status';

/**
 * Inicio con contenido según el rol:
 * - Estudiante: sus reservas, la próxima y accesos rápidos.
 * - Docente/Admin: reservas por aprobar (con acciones directas), equipos en uso y agenda del día.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, RouterLink, StatusBadge],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private bookingsService = inject(BookingsService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  protected userService = inject(UserService);
  protected lookup = inject(CatalogLookupService);

  protected loading = signal(true);
  protected bookings = signal<Booking[]>([]);
  protected busyId = signal<number | null>(null);

  protected readonly todayDate = new Date();

  protected greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  })();

  /** Reservas del estudiante conectado (el studentId se guarda con su usuario institucional). */
  protected mine = computed(() => {
    const username = (this.userService.user()?.username ?? '').toLowerCase();
    return this.bookings().filter((b) => (b.studentId ?? '').toLowerCase() === username);
  });

  /** Base de las métricas: las propias para estudiantes, todas para Docente/Admin. */
  protected base = computed(() => (this.userService.canManageBookings() ? this.bookings() : this.mine()));

  protected upcoming = computed(() => {
    const now = Date.now();
    return this.base()
      .filter((b) => !isFinal(b.status) && new Date(b.to).getTime() >= now)
      .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
      .slice(0, 5);
  });

  protected nextBooking = computed(() => this.upcoming()[0] ?? null);

  protected pending = computed(() =>
    this.bookings()
      .filter((b) => b.status === 'SOLICITADA')
      .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()),
  );

  protected inUse = computed(() => this.bookings().filter((b) => b.status === 'EN_USO'));

  protected today = computed(() => {
    const today = new Date().toDateString();
    return this.bookings()
      .filter((b) => new Date(b.from).toDateString() === today && b.status !== 'CANCELADA')
      .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
  });

  protected stats = computed(() => {
    const list = this.base();
    return {
      total: list.length,
      pending: list.filter((b) => b.status === 'SOLICITADA').length,
      active: list.filter((b) => isActive(b.status)).length,
      done: list.filter((b) => b.status === 'DEVUELTA').length,
    };
  });

  /** Distribución por estado para la barra apilada. */
  protected distribution = computed(() => {
    const list = this.base();
    const total = list.length || 1;
    return ALL_STATUSES.map((s) => {
      const count = list.filter((b) => b.status === s).length;
      return { status: s, meta: STATUS_META[s], count, pct: (count / total) * 100 };
    }).filter((d) => d.count > 0);
  });

  ngOnInit(): void {
    this.lookup.load();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.bookingsService.getAll().subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las reservas', apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  async quickAction(booking: Booking, status: BookingStatus): Promise<void> {
    if (!booking.id) return;
    const approve = status === 'APROBADA';
    const ok = await this.confirm.ask({
      title: approve ? '¿Aprobar reserva?' : '¿Cancelar reserva?',
      message: `${this.lookup.name(booking.resourceId)} · ${booking.studentId}`,
      confirmText: approve ? 'Aprobar' : 'Cancelar reserva',
      cancelText: 'Volver',
      tone: approve ? 'success' : 'danger',
      icon: approve ? 'bi-check2-circle' : 'bi-x-circle',
    });
    if (!ok) return;

    this.busyId.set(booking.id);
    this.bookingsService.updateStatus(booking.id, status).subscribe({
      next: () => {
        this.toast.success(approve ? 'Reserva aprobada' : 'Reserva cancelada', `Reserva #${booking.id}`);
        this.busyId.set(null);
        this.load();
      },
      error: (err) => {
        this.toast.error('No se pudo actualizar la reserva', apiErrorMessage(err));
        this.busyId.set(null);
      },
    });
  }

  /** Equipo entregado cuya hora de devolución ya pasó. */
  isOverdue(booking: Booking): boolean {
    return booking.status === 'EN_USO' && new Date(booking.to).getTime() < Date.now();
  }

  openBooking(booking: Booking): void {
    this.router.navigate(['/bookings'], { queryParams: { id: booking.id } });
  }
}
