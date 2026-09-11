import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { Bookings } from './bookings/bookings';

export const routes: Routes = [
    { 
        path: 'bookings', 
        component: Bookings, 
        canActivate: [MsalGuard]
    },
    { 
        path: '', 
        redirectTo: 'bookings', 
        pathMatch: 'full' 
    }
];