import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService, Laboratory, Resource } from '../services/catalog.service';
import { CatalogLookupService } from '../services/catalog-lookup.service';
import { UserService } from '../services/user.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';
import { Booking, BookingsService } from '../services/bookings.service';
import { isFinal } from '../shared/booking-status';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type Tab = 'labs' | 'resources';

/** Categorías conocidas de recursos (el backend guarda el código en inglés). */
const CATEGORY_META: Record<string, { label: string; icon: string; tone: string }> = {
  EQUIPMENT: { label: 'Equipo', icon: 'bi-cpu', tone: 'tone-primary' },
  SUPPLY: { label: 'Insumo', icon: 'bi-box-seam', tone: 'tone-warning' },
};

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css'],
})
export class CatalogComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private bookingsService = inject(BookingsService);
  protected lookup = inject(CatalogLookupService);
  protected userService = inject(UserService);

  protected tab = signal<Tab>('labs');
  protected search = signal('');
  protected category = signal('');
  protected showForm = signal(false);
  protected submitted = signal(false);
  protected saving = signal(false);
  /** id del laboratorio o recurso que se está editando (null = formulario de alta). */
  protected editingId = signal<number | null>(null);
  protected deletingId = signal<number | null>(null);

  protected labForm: Laboratory = this.emptyLab();
  protected resourceForm: Resource = this.emptyResource();

  protected categories = computed(() => [...new Set(this.lookup.resources().map((r) => r.category).filter(Boolean))]);

  protected labs = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.lookup.labs().filter((l) =>
      !term || [l.code, l.name, l.location, l.description].some((v) => (v ?? '').toLowerCase().includes(term)));
  });

  protected resources = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.lookup.resources().filter((r) =>
      (!this.category() || r.category === this.category())
      && (!term || [r.code, r.name, r.category, r.description].some((v) => (v ?? '').toLowerCase().includes(term))));
  });

  protected totals = computed(() => ({
    labs: this.lookup.labs().length,
    resources: this.lookup.resources().length,
    capacity: this.lookup.labs().reduce((sum, l) => sum + (l.capacity ?? 0), 0),
    lowStock: this.lookup.resources().filter((r) => r.stock <= 5).length,
  }));

  ngOnInit(): void {
    this.lookup.load(true);
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.category.set('');
    this.closeForm();
  }

  categoryMeta(category: string) {
    return CATEGORY_META[category] ?? { label: category, icon: 'bi-tag', tone: 'tone-neutral' };
  }

  /** Nivel de stock para el indicador de color. */
  stockLevel(stock: number): { tone: string; label: string; pct: number; color: string } {
    if (stock <= 0) return { tone: 'tone-danger', label: 'Sin stock', pct: 0, color: 'var(--danger)' };
    if (stock <= 5) return { tone: 'tone-warning', label: 'Stock bajo', pct: Math.min(stock * 10, 100), color: 'var(--warning)' };
    return { tone: 'tone-success', label: 'Disponible', pct: Math.min(stock * 4, 100), color: 'var(--success)' };
  }

  reserve(code: string): void {
    this.router.navigate(['/bookings'], { queryParams: { resource: code } });
  }

  // ================= ALTA, EDICIÓN Y BAJA (solo Admin) =================

  toggleForm(): void {
    if (this.showForm()) {
      this.closeForm();
    } else {
      this.showForm.set(true);
    }
  }

  closeForm(): void {
    this.showForm.set(false);
    this.submitted.set(false);
    this.editingId.set(null);
    this.labForm = this.emptyLab();
    this.resourceForm = this.emptyResource();
  }

  editLab(lab: Laboratory): void {
    this.labForm = { ...lab, description: lab.description ?? '', isAvailable: lab.isAvailable !== false };
    this.openEdit(lab.id);
  }

  editResource(res: Resource): void {
    this.resourceForm = { ...res, description: res.description ?? '', isAvailable: res.isAvailable !== false };
    this.openEdit(res.id);
  }

  private openEdit(id?: number): void {
    this.editingId.set(id ?? null);
    this.submitted.set(false);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async removeLab(lab: Laboratory): Promise<void> {
    if (!lab.id || !(await this.confirmDelete('el laboratorio', lab.name, lab.code))) return;
    this.deletingId.set(lab.id);
    this.catalogService.deleteLaboratory(lab.id).subscribe({
      next: () => this.afterDelete(`Laboratorio "${lab.name}" eliminado`),
      error: (err) => this.onDeleteError(err),
    });
  }

  async removeResource(res: Resource): Promise<void> {
    if (!res.id || !(await this.confirmDelete('el recurso', res.name, res.code))) return;
    this.deletingId.set(res.id);
    this.catalogService.deleteResource(res.id).subscribe({
      next: () => this.afterDelete(`Recurso "${res.name}" eliminado`),
      error: (err) => this.onDeleteError(err),
    });
  }

  /** Confirma la baja avisando si el código tiene reservas activas (las reservas guardan el código). */
  private async confirmDelete(kind: string, name: string, code: string): Promise<boolean> {
    const bookings = await firstValueFrom(this.bookingsService.getAll().pipe(catchError(() => of([] as Booking[]))));
    const active = bookings.filter((b) => b.resourceId === code && !isFinal(b.status)).length;
    return this.confirm.ask({
      title: `¿Eliminar ${kind} "${name}"?`,
      message: active
        ? `Tiene ${active} reserva(s) activa(s). Las reservas se conservan, pero quedarán apuntando a un código (${code}) que ya no existe en el catálogo.`
        : `Se eliminará ${code} del catálogo. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      icon: 'bi-trash',
    });
  }

  private afterDelete(title: string): void {
    this.toast.success(title);
    this.deletingId.set(null);
    if (this.editingId()) this.closeForm();
    this.lookup.load(true);
  }

  private onDeleteError(err: unknown): void {
    this.toast.error('No se pudo eliminar', apiErrorMessage(err));
    this.deletingId.set(null);
  }

  protected labErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!this.editingId()) {
      const code = this.labForm.code.trim();
      if (!code) e['code'] = 'El código es obligatorio';
      else if (!/^[A-Z0-9-]{3,20}$/.test(code)) e['code'] = 'Usa 3–20 mayúsculas, números o guiones (ej. LAB-QUIM)';
      else if (this.lookup.find(code)) e['code'] = 'Ya existe un laboratorio o recurso con ese código';
    }
    if (!this.labForm.name.trim()) e['name'] = 'El nombre es obligatorio';
    if (!this.labForm.location.trim()) e['location'] = 'La ubicación es obligatoria';
    if (!this.labForm.capacity || this.labForm.capacity < 1) e['capacity'] = 'La capacidad debe ser mayor que 0';
    return e;
  }

  protected resourceErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!this.editingId()) {
      const code = this.resourceForm.code.trim();
      if (!code) e['code'] = 'El código es obligatorio';
      else if (!/^[A-Z0-9-]{3,20}$/.test(code)) e['code'] = 'Usa 3–20 mayúsculas, números o guiones (ej. EQ-MULT-01)';
      else if (this.lookup.find(code)) e['code'] = 'Ya existe un laboratorio o recurso con ese código';
    }
    if (!this.resourceForm.name.trim()) e['name'] = 'El nombre es obligatorio';
    if (!this.resourceForm.category) e['category'] = 'Selecciona una categoría';
    if (this.resourceForm.stock == null || this.resourceForm.stock < 0) e['stock'] = 'El stock no puede ser negativo';
    return e;
  }

  onSubmitLab(): void {
    this.submitted.set(true);
    if (Object.keys(this.labErrors()).length) return;
    this.saving.set(true);
    const id = this.editingId();
    const request = id
      ? this.catalogService.updateLaboratory(id, this.labForm)
      : this.catalogService.createLaboratory({ ...this.labForm, code: this.labForm.code.trim() });
    request.subscribe({
      next: (lab) => this.afterSave(`Laboratorio "${lab.name}" ${id ? 'actualizado' : 'registrado'}`),
      error: (err) => this.onSaveError(err),
    });
  }

  onSubmitResource(): void {
    this.submitted.set(true);
    if (Object.keys(this.resourceErrors()).length) return;
    this.saving.set(true);
    const id = this.editingId();
    const request = id
      ? this.catalogService.updateResource(id, this.resourceForm)
      : this.catalogService.createResource({ ...this.resourceForm, code: this.resourceForm.code.trim() });
    request.subscribe({
      next: (res) => id
        ? this.afterSave(`Recurso "${res.name}" actualizado`)
        : this.afterSave(`Recurso "${res.name}" registrado`, 'Se publicó la notificación en RabbitMQ'),
      error: (err) => this.onSaveError(err),
    });
  }

  private afterSave(title: string, message?: string): void {
    this.toast.success(title, message);
    this.saving.set(false);
    this.closeForm();
    this.lookup.load(true);
  }

  private onSaveError(err: unknown): void {
    this.toast.error('No se pudo guardar', apiErrorMessage(err));
    this.saving.set(false);
  }

  private emptyLab(): Laboratory {
    return { name: '', code: '', location: '', capacity: 20, description: '', isAvailable: true };
  }

  private emptyResource(): Resource {
    return { name: '', code: '', category: 'EQUIPMENT', stock: 1, description: '', isAvailable: true };
  }
}
