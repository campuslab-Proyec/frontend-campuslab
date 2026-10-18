import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartData } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReportService, KpiResponse, TopResourceDto } from '../services/report.service';
import { Booking, BookingsService } from '../services/bookings.service';
import { CatalogLookupService } from '../services/catalog-lookup.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';
import { ChartComponent } from '../shared/chart';
import { ALL_STATUSES, STATUS_META } from '../shared/booking-status';

type Range = 'last24h' | 'last7d' | 'last30d';

const RANGE_MS: Record<Range, number> = {
  last24h: 24 * 3_600_000,
  last7d: 7 * 24 * 3_600_000,
  last30d: 30 * 24 * 3_600_000,
};

/**
 * KPIs de ms-campuslab-report (agregados en el backend) + gráficos calculados a partir de las
 * reservas del rango seleccionado (por estado, por día y por hora de inicio).
 */
@Component({
  selector: 'app-report',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ChartComponent],
  templateUrl: './report.html',
  styleUrl: './report.css',
})
export class Report implements OnInit {
  private reportService = inject(ReportService);
  private bookingsService = inject(BookingsService);
  private toast = inject(ToastService);
  protected lookup = inject(CatalogLookupService);

  protected kpis = signal<KpiResponse | null>(null);
  protected topResources = signal<TopResourceDto[]>([]);
  protected bookings = signal<Booking[]>([]);
  protected loading = signal(true);
  protected range = signal<Range>('last7d');

  protected readonly rangeOptions: { value: Range; label: string }[] = [
    { value: 'last24h', label: '24 horas' },
    { value: 'last7d', label: '7 días' },
    { value: 'last30d', label: '30 días' },
  ];

  /** Reservas creadas dentro del rango (si no hay createdAt se usa la fecha de inicio). */
  private inRange = computed(() => {
    const since = Date.now() - RANGE_MS[this.range()];
    return this.bookings().filter((b) => new Date(b.createdAt ?? b.from).getTime() >= since);
  });

  protected cancelRate = computed(() => {
    const list = this.inRange();
    return list.length ? (list.filter((b) => b.status === 'CANCELADA').length / list.length) * 100 : 0;
  });

  protected topChart = computed<ChartData<'bar'>>(() => ({
    labels: this.topResources().map((r) => this.lookup.name(r.resourceId)),
    datasets: [{
      label: 'Reservas',
      data: this.topResources().map((r) => r.totalBookings),
      backgroundColor: ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'],
      borderRadius: 8,
      maxBarThickness: 46,
    }],
  }));

  protected statusChart = computed<ChartData<'doughnut'>>(() => {
    const present = ALL_STATUSES.filter((s) => this.inRange().some((b) => b.status === s));
    return {
      labels: present.map((s) => STATUS_META[s].label),
      datasets: [{
        data: present.map((s) => this.inRange().filter((b) => b.status === s).length),
        backgroundColor: present.map((s) => STATUS_META[s].color),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };
  });

  /** Serie temporal: por hora en 24 h, por día en 7/30 días. */
  protected trendChart = computed<ChartData<'line'>>(() => {
    const hourly = this.range() === 'last24h';
    const buckets = hourly ? 24 : this.range() === 'last7d' ? 7 : 30;
    const step = hourly ? 3_600_000 : 24 * 3_600_000;
    const end = new Date();
    if (hourly) end.setMinutes(0, 0, 0); else end.setHours(0, 0, 0, 0);

    const starts = Array.from({ length: buckets }, (_, i) => end.getTime() - (buckets - 1 - i) * step);
    const counts = starts.map((start) =>
      this.inRange().filter((b) => {
        const t = new Date(b.createdAt ?? b.from).getTime();
        return t >= start && t < start + step;
      }).length);

    return {
      labels: starts.map((t) => hourly
        ? new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        : new Date(t).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })),
      datasets: [{
        label: 'Reservas creadas',
        data: counts,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
      }],
    };
  });

  /** Horas de mayor demanda según la hora de inicio de las reservas (07–21 h). */
  protected peakChart = computed<ChartData<'bar'>>(() => {
    const hours = Array.from({ length: 15 }, (_, i) => 7 + i);
    return {
      labels: hours.map((h) => `${h}:00`),
      datasets: [{
        label: 'Reservas que comienzan',
        data: hours.map((h) => this.inRange().filter((b) => new Date(b.from).getHours() === h).length),
        backgroundColor: '#06b6d4',
        borderRadius: 6,
        maxBarThickness: 28,
      }],
    };
  });

  protected horizontalBar = { indexAxis: 'y' as const, plugins: { legend: { display: false } } };
  protected noLegend = { plugins: { legend: { display: false } } };

  ngOnInit(): void {
    this.lookup.load();
    this.loadReport();
  }

  setRange(range: Range): void {
    this.range.set(range);
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    const range = this.range();
    forkJoin({
      kpis: this.reportService.getKpis(range),
      top: this.reportService.getTopResources(range),
      bookings: this.bookingsService.getAll().pipe(catchError(() => of([] as Booking[]))),
    }).subscribe({
      next: ({ kpis, top, bookings }) => {
        this.kpis.set(kpis);
        this.topResources.set(top);
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error('No se pudo cargar el reporte', apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
