import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { Bookings } from './bookings/bookings';
import { CatalogComponent } from './catalog/catalog';

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
        path: '', 
        redirectTo: 'catalog', 
        pathMatch: 'full' 
    }
];