import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (confirm.pending(); as c) {
      <div class="overlay" (click)="confirm.close(false)">
        <div class="modal-x" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="modal-x-icon" [class]="'modal-x-icon tone-' + (c.tone ?? 'primary')">
            <i class="bi" [class]="'bi ' + (c.icon ?? 'bi-question-circle')"></i>
          </div>
          <h3>{{ c.title }}</h3>
          <p>{{ c.message }}</p>
          <div class="modal-x-actions">
            <button class="btn btn-ghost" (click)="confirm.close(false)">{{ c.cancelText ?? 'Cancelar' }}</button>
            <button class="btn"
                    [class.btn-danger]="c.tone === 'danger'"
                    [class.btn-primary]="c.tone !== 'danger'"
                    (click)="confirm.close(true)">
              {{ c.confirmText ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  protected confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.pending()) this.confirm.close(false);
  }
}
