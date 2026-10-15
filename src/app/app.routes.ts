import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { Bookings } from './bookings/bookings';
import { CatalogComponent } from './catalog/catalog.component';
import { Audit } from './audit/audit';
import { Report } from './report/report';
import { roleGuard } from './role.guard';

export const routes: Routes = [
    { 
        path: 'catalog', 
        component: CatalogComponent, 
        canActivate: [MsalGuard]
    },
    { 
        path: 'bookings', 
        component: Bookings, 
        canActivate: [MsalGuard]
    },
    {
        path: 'audit',
        component: Audit,
        canActivate: [MsalGuard, roleGuard],
        data: { role: 'Admin' }
    },
    {
        path: 'report',
        component: Report,
        canActivate: [MsalGuard, roleGuard],
        data: { role: 'Admin' }
    },
    { 
        path: '', 
        redirectTo: 'catalog', 
        pathMatch: 'full' 
    }
];