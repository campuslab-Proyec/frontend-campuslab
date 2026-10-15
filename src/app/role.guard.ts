import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { UserService } from './services/user.service';

/** Permite entrar a la ruta solo si el usuario tiene el rol indicado en `data.role`. */
export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  return inject(UserService)
    .hasRole(route.data['role'])
    .pipe(map((allowed) => allowed || router.createUrlTree(['/catalog'])));
};
