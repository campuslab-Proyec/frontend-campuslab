import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CatalogService, Laboratory, Resource } from './catalog.service';

export interface CatalogOption {
  code: string;
  name: string;
  kind: 'lab' | 'resource';
  detail: string;
}

/**
 * Laboratorios y recursos cacheados para traducir códigos (resourceId de las reservas) a nombres
 * y para poblar el selector de "Nueva reserva".
 */
@Injectable({ providedIn: 'root' })
export class CatalogLookupService {
  private catalog = inject(CatalogService);

  readonly labs = signal<Laboratory[]>([]);
  readonly resources = signal<Resource[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  readonly options = computed<CatalogOption[]>(() => [
    ...this.labs().map((l) => ({ code: l.code, name: l.name, kind: 'lab' as const, detail: l.location })),
    ...this.resources().map((r) => ({ code: r.code, name: r.name, kind: 'resource' as const, detail: `Stock: ${r.stock}` })),
  ]);

  private byCode = computed(() => new Map(this.options().map((o) => [o.code, o])));

  load(force = false): void {
    if (this.loaded && !force) return;
    this.loaded = true;
    this.loading.set(true);
    forkJoin({
      labs: this.catalog.getLaboratories().pipe(catchError(() => of([] as Laboratory[]))),
      resources: this.catalog.getResources().pipe(catchError(() => of([] as Resource[]))),
    }).subscribe(({ labs, resources }) => {
      this.labs.set(labs);
      this.resources.set(resources);
      this.loading.set(false);
    });
  }

  /** Nombre legible de un código; si no está en el catálogo, devuelve el código tal cual. */
  name(code: string | undefined | null): string {
    if (!code) return '—';
    return this.byCode().get(code)?.name ?? code;
  }

  find(code: string | undefined | null): CatalogOption | undefined {
    return code ? this.byCode().get(code) : undefined;
  }
}
