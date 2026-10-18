import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

/** Notificaciones flotantes (esquina inferior derecha) que se cierran solas. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message, 7000);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(type: ToastType, title: string, message?: string, durationMs = 4500): void {
    const toast: Toast = { id: this.nextId++, type, title, message };
    this.toasts.update((list) => [...list.slice(-4), toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}

/**
 * Extrae el mensaje legible de un error HTTP: prioriza el del backend ({"error": ...},
 * con "details" de validación) sobre el genérico "Http failure response...".
 */
export function apiErrorMessage(err: any, fallback = 'Ocurrió un error inesperado'): string {
  const body = err?.error;
  if (typeof body === 'string' && body.trim()) {
    try {
      return apiErrorMessage({ error: JSON.parse(body) }, fallback);
    } catch {
      return body;
    }
  }
  if (body?.details?.length) {
    return `${body.error}: ${body.details.join(' · ')}`;
  }
  if (err?.status === 403) return 'No tienes permisos para esta acción';
  if (err?.status === 0) return 'No hay conexión con el servidor';
  return body?.error ?? body?.detail ?? body?.message ?? err?.message ?? fallback;
}
