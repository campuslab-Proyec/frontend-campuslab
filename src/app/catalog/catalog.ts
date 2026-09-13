import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogService, Resource } from '../services/catalog.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h2>Catálogo de Recursos y Equipos</h2>
      <table class="table table-striped mt-3">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let res of resources">
            <td>{{ res.code }}</td>
            <td>{{ res.name }}</td>
            <td>{{ res.category }}</td>
            <td>{{ res.stock }}</td>
            <td>
              <span [class]="res.isAvailable ? 'badge bg-success' : 'badge bg-danger'">
                {{ res.isAvailable ? 'Disponible' : 'No disponible' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class CatalogComponent implements OnInit {
  resources: Resource[] = [];

  constructor(private catalogService: CatalogService) {}

  ngOnInit(): void {
    this.catalogService.getResources().subscribe({
      next: (data) => (this.resources = data),
      error: (err) => console.error('Error cargando recursos:', err)
    });
  }
}