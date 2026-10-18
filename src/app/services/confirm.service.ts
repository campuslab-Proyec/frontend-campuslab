import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary' | 'warning' | 'success';
  icon?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Diálogo de confirmación propio (reemplaza window.confirm). Uso: `if (await confirm.ask({...}))`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  close(ok: boolean): void {
    this.pending()?.resolve(ok);
    this.pending.set(null);
  }
}
