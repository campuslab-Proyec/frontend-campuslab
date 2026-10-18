import { Component, computed, input } from '@angular/core';
import { statusMeta } from './booking-status';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="status-pill" [class]="'status-pill tone-' + meta().tone">{{ meta().label }}</span>`,
})
export class StatusBadge {
  readonly status = input<string | null | undefined>();
  protected meta = computed(() => statusMeta(this.status()));
}
