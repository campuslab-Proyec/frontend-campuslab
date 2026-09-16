import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, KpiResponse, TopResourceDto } from '../services/report.service';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report.html',
  styleUrl: './report.css',
})
export class Report implements OnInit {
  private reportService = inject(ReportService);

  kpis = signal<KpiResponse | null>(null);
  topResources = signal<TopResourceDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  range = 'last24h';
  rangeOptions = [
    { value: 'last24h', label: 'Últimas 24 horas' },
    { value: 'last7d', label: 'Últimos 7 días' },
    { value: 'last30d', label: 'Últimos 30 días' },
  ];

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportService.getKpis(this.range).subscribe({
      next: (data) => this.kpis.set(data),
      error: (err) => this.error.set(err?.message ?? 'Error al cargar los KPIs'),
    });

    this.reportService.getTopResources(this.range).subscribe({
      next: (data) => {
        this.topResources.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar el top de recursos');
        this.loading.set(false);
      },
    });
  }

  onRangeChange(): void {
    this.loadReport();
  }
}
