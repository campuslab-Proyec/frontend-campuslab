import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { roleGuard } from './role.guard';
import { landingGuard } from './landing.guard';
import { Home } from './home/home';
import { Bookings } from './bookings/bookings';
import { CatalogComponent } from './catalog/catalog.component';
import { Audit } from './audit/audit';
import { Report } from './report/report';
import { Alerts } from './alerts/alerts';
import { RabbitAdmin } from './rabbit-admin/rabbit-admin';

export const routes: Routes = [
    { path: 'home', component: Home, canActivate: [MsalGuard], data: { title: 'Inicio' } },
    { path: 'catalog', component: CatalogComponent, canActivate: [MsalGuard], data: { title: 'Catálogo' } },
    { path: 'bookings', component: Bookings, canActivate: [MsalGuard], data: { title: 'Reservas' } },
    // Solo Admin (el BFF también lo exige; el guard evita mostrar una página que respondería 403)
    { path: 'audit', component: Audit, canActivate: [MsalGuard, roleGuard], data: { title: 'Auditoría', role: 'Admin' } },
    { path: 'report', component: Report, canActivate: [MsalGuard, roleGuard], data: { title: 'Reportes', role: 'Admin' } },
    { path: 'rabbit', component: RabbitAdmin, canActivate: [MsalGuard, roleGuard], data: { title: 'Panel RabbitMQ', role: 'Admin' } },
    { path: 'alerts', component: Alerts, canActivate: [MsalGuard, roleGuard], data: { title: 'Alertas y guías', role: 'Admin' } },
    // Raíz: página de bienvenida sin sesión, /home con sesión
    { path: '', pathMatch: 'full', canActivate: [landingGuard], children: [] },
    { path: '**', redirectTo: '' }
];
