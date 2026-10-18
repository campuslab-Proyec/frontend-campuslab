import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, AuditEvent } from '../services/audit.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';
import { StatusBadge } from '../shared/status-badge';
import { STATUS_META, statusMeta } from '../shared/booking-status';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [DatePipe, FormsModule, StatusBadge],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
})
export class Audit implements OnInit {
  private auditService = inject(AuditService);
  private toast = inject(ToastService);

  protected events = signal<AuditEvent[]>([]);
  protected loading = signal(true);

  // ---- filtros ----
  protected search = signal('');
  protected action = signal('');
  protected role = signal('');
  protected from = signal('');
  protected to = signal('');
  protected page = signal(1);

  protected actions = computed(() => [...new Set(this.events().map((e) => e.action))].sort());
  protected roles = computed(() =>
    [...new Set(this.events().flatMap((e) => (e.actorRole ?? '').split(',')).map((r) => r.trim()).filter(Boolean))].sort());

  protected filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const from = this.from() ? new Date(this.from() + 'T00:00:00').getTime() : null;
    const to = this.to() ? new Date(this.to() + 'T23:59:59').getTime() : null;
    return this.events().filter((e) => {
      const t = new Date(e.timestamp).getTime();
      if (this.action() && e.action !== this.action()) return false;
      if (this.role() && !(e.actorRole ?? '').split(',').map((r) => r.trim()).includes(this.role())) return false;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      if (!term) return true;
      return [e.bookingId, e.actorId, e.action, e.detail].some((v) => (v ?? '').toLowerCase().includes(term));
    });
  });

  protected pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  protected paged = computed(() => this.filtered().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  /** Resumen de eventos por acción (tarjetas superiores). */
  protected summary = computed(() =>
    this.actions().map((a) => ({
      action: a,
      meta: statusMeta(a),
      count: this.events().filter((e) => e.action === a).length,
    })));

  protected stats = computed(() => {
    const list = this.events();
    const today = new Date().toDateString();
    return {
      total: list.length,
      today: list.filter((e) => new Date(e.timestamp).toDateString() === today).length,
      actors: new Set(list.map((e) => e.actorId)).size,
      bookings: new Set(list.map((e) => e.bookingId)).size,
    };
  });

  protected hasFilters = computed(() => !!(this.search() || this.action() || this.role() || this.from() || this.to()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.auditService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error('No se pudo cargar la auditoría', apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  /** Cualquier cambio de filtro vuelve a la primera página. */
  setFilter(filter: { set: (v: string) => void }, value: string): void {
    filter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    [this.search, this.action, this.role, this.from, this.to].forEach((f) => f.set(''));
    this.page.set(1);
  }

  isStatus(action: string): boolean {
    return action in STATUS_META;
  }

  /** Exporta los eventos filtrados a CSV (separador ";" y BOM para que Excel respete los acentos). */
  exportCsv(): void {
    const header = ['ID', 'Fecha', 'Reserva', 'Acción', 'Usuario', 'Rol', 'Detalle'];
    const rows = this.filtered().map((e) => [
      e.id, e.timestamp, e.bookingId, e.action, e.actorId, e.actorRole, e.detail ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-campuslab-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('CSV exportado', `${rows.length} evento(s)`);
  }
}
