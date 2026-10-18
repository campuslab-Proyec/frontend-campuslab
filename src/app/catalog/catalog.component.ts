import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService, Laboratory, Resource } from '../services/catalog.service';
import { CatalogLookupService } from '../services/catalog-lookup.service';
import { UserService } from '../services/user.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';

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
  protected lookup = inject(CatalogLookupService);
  protected userService = inject(UserService);

  protected tab = signal<Tab>('labs');
  protected search = signal('');
  protected category = signal('');
  protected showForm = signal(false);
  protected submitted = signal(false);
  protected saving = signal(false);

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
    this.showForm.set(false);
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

  // ================= ALTA (solo Admin) =================

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.submitted.set(false);
  }

  protected labErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!this.labForm.code.trim()) e['code'] = 'El código es obligatorio';
    else if (!/^[A-Z0-9-]{3,20}$/.test(this.labForm.code.trim())) e['code'] = 'Usa 3–20 mayúsculas, números o guiones (ej. LAB-QUIM)';
    if (!this.labForm.name.trim()) e['name'] = 'El nombre es obligatorio';
    if (!this.labForm.location.trim()) e['location'] = 'La ubicación es obligatoria';
    if (!this.labForm.capacity || this.labForm.capacity < 1) e['capacity'] = 'La capacidad debe ser mayor que 0';
    return e;
  }

  protected resourceErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!this.resourceForm.code.trim()) e['code'] = 'El código es obligatorio';
    else if (!/^[A-Z0-9-]{3,20}$/.test(this.resourceForm.code.trim())) e['code'] = 'Usa 3–20 mayúsculas, números o guiones (ej. EQ-MULT-01)';
    if (!this.resourceForm.name.trim()) e['name'] = 'El nombre es obligatorio';
    if (!this.resourceForm.category) e['category'] = 'Selecciona una categoría';
    if (this.resourceForm.stock == null || this.resourceForm.stock < 0) e['stock'] = 'El stock no puede ser negativo';
    return e;
  }

  onSubmitLab(): void {
    this.submitted.set(true);
    if (Object.keys(this.labErrors()).length) return;
    this.saving.set(true);
    this.catalogService.createLaboratory({ ...this.labForm, code: this.labForm.code.trim() }).subscribe({
      next: (lab) => this.afterSave(`Laboratorio "${lab.name}" registrado`),
      error: (err) => this.onSaveError(err),
    });
  }

  onSubmitResource(): void {
    this.submitted.set(true);
    if (Object.keys(this.resourceErrors()).length) return;
    this.saving.set(true);
    this.catalogService.createResource({ ...this.resourceForm, code: this.resourceForm.code.trim() }).subscribe({
      next: (res) => this.afterSave(`Recurso "${res.name}" registrado`, 'Se publicó la notificación en RabbitMQ'),
      error: (err) => this.onSaveError(err),
    });
  }

  private afterSave(title: string, message?: string): void {
    this.toast.success(title, message);
    this.saving.set(false);
    this.submitted.set(false);
    this.showForm.set(false);
    this.labForm = this.emptyLab();
    this.resourceForm = this.emptyResource();
    this.lookup.load(true);
  }

  private onSaveError(err: unknown): void {
    this.toast.error('No se pudo guardar', apiErrorMessage(err));
    this.saving.set(false);
  }

  private emptyLab(): Laboratory {
    return { name: '', code: '', location: '', capacity: 20, description: '' };
  }

  private emptyResource(): Resource {
    return { name: '', code: '', category: 'EQUIPMENT', stock: 1, description: '' };
  }
}
