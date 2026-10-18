import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../services/toast.service';

const ICONS: Record<ToastType, string> = {
  success: 'bi-check-circle-fill',
  error: 'bi-x-octagon-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toastService.toasts(); track t.id) {
        <div class="toast-x" [class]="'toast-x ' + t.type" role="status">
          <i class="bi toast-icon" [class]="'bi toast-icon ' + icons[t.type]"></i>
          <div>
            <div class="toast-title">{{ t.title }}</div>
            @if (t.message) {
              <div class="toast-msg">{{ t.message }}</div>
            }
          </div>
          <button class="toast-close" (click)="toastService.dismiss(t.id)" aria-label="Cerrar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  protected toastService = inject(ToastService);
  protected icons = ICONS;
}
