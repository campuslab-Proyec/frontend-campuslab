import { Component, ElementRef, OnDestroy, afterRenderEffect, inject, input, viewChild } from '@angular/core';
import { Chart, ChartData, ChartOptions, ChartType, registerables } from 'chart.js';
import { ThemeService } from '../services/theme.service';

Chart.register(...registerables);

/**
 * Envoltorio mínimo de Chart.js. Se vuelve a dibujar cuando cambian los datos o el tema
 * (los colores de ejes y textos salen de los tokens CSS del tema activo).
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="chart-box" [style.height.px]="height()"><canvas #canvas></canvas></div>`,
  styles: [`.chart-box { position: relative; width: 100%; }`],
})
export class ChartComponent implements OnDestroy {
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartData>();
  readonly options = input<ChartOptions>({});
  readonly height = input(280);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private theme = inject(ThemeService);
  private chart?: Chart;

  constructor() {
    // afterRenderEffect: el canvas ya existe en el DOM cuando se ejecuta
    afterRenderEffect(() => {
      const type = this.type();
      const data = this.data();
      const options = this.options();
      this.theme.theme(); // dependencia: redibuja al cambiar de tema
      this.render(type, data, options);
    });
  }

  private render(type: ChartType, data: ChartData, options: ChartOptions): void {
    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--text-muted').trim() || '#64748b';
    const grid = css.getPropertyValue('--border').trim() || '#e2e8f0';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = text;

    const isRadial = type === 'doughnut' || type === 'pie' || type === 'polarArea';
    const base: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { position: isRadial ? 'right' : 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: { padding: 10, cornerRadius: 8 },
      },
      ...(isRadial
        ? {}
        : {
            scales: {
              x: { grid: { color: grid }, ticks: { color: text } },
              y: { grid: { color: grid }, ticks: { color: text, precision: 0 }, beginAtZero: true },
            },
          }),
    };

    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, {
      type,
      data,
      options: { ...base, ...options, plugins: { ...base.plugins, ...options.plugins } } as ChartOptions,
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
