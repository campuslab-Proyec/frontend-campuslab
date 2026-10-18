import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../environments/environment';

/**
 * Ruta raíz: con sesión iniciada va al inicio; sin sesión deja pasar para que App muestre la
 * página de bienvenida, en vez de que MsalGuard redirija de inmediato al login de Microsoft.
 */
export const landingGuard: CanActivateFn = () => {
  const msal = inject(MsalService).instance;
  const loggedIn = !!msal.getActiveAccount()
    || msal.getAllAccounts().some((account) => account.tenantId === environment.azure.tenantId);
  return loggedIn ? inject(Router).createUrlTree(['/home']) : true;
};
