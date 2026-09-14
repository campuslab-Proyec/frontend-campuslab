import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService, Laboratory, Resource } from '../services/catalog.service';

@Component({
    selector: 'app-catalog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './catalog.component.html',
    styleUrls: ['./catalog.component.css']
})
export class CatalogComponent implements OnInit {
    activeTab: 'labs' | 'resources' = 'labs';
    
    laboratories: Laboratory[] = [];
    resources: Resource[] = [];

    labForm: Laboratory = { name: '', code: '', location: '', capacity: 0, description: '' };
    resourceForm: Resource = { name: '', code: '', category: '', stock: 0, description: '' };

    constructor(private catalogService: CatalogService) {}

    ngOnInit(): void {
        this.loadData();
}

setTab(tab: 'labs' | 'resources'): void {
    this.activeTab = tab;
    this.loadData();
}

loadData(): void {
    if (this.activeTab === 'labs') {
    this.catalogService.getLaboratories().subscribe({
        next: (data) => this.laboratories = data,
        error: (err) => console.error('Error al cargar laboratorios:', err)
    });
    } else {
    this.catalogService.getResources().subscribe({
        next: (data) => this.resources = data,
        error: (err) => console.error('Error al cargar recursos:', err)
    });
    }
}

onSubmitLab(): void {
    this.catalogService.createLaboratory(this.labForm).subscribe({
    next: () => {
        this.labForm = { name: '', code: '', location: '', capacity: 0, description: '' };
        this.loadData();
    },
    error: (err) => console.error('Error al crear laboratorio:', err)
    });
}

onSubmitResource(): void {
    this.catalogService.createResource(this.resourceForm).subscribe({
    next: () => {
        this.resourceForm = { name: '', code: '', category: '', stock: 0, description: '' };
        this.loadData();
    },
    error: (err) => console.error('Error al crear recurso:', err)
    });
}
}