import {
  ApplicationConfig,
  LOCALE_ID,
  provideZoneChangeDetection,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';
import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MsalInterceptor,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';
import {
  PublicClientApplication,
  InteractionType,
  IPublicClientApplication,
} from '@azure/msal-browser';
import { environment } from '../environments/environment';

// Fechas y números en español (lun, oct, 1.234,5) para todos los pipes
registerLocaleData(localeEs);

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.msalConfig.auth.clientId,
      authority: environment.msalConfig.auth.authority,
      // Siempre el origen real desde el que se abre la app (https://tu-dominio en EC2)
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'localStorage' },
  });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  // Adjunta el token a las peticiones que vayan al BFF (mismo origen, /api/*)
  protectedResourceMap.set(`${window.location.origin}/api/*`, environment.apiConfig.scopes);
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: environment.apiConfig.scopes,
    },
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    { provide: LOCALE_ID, useValue: 'es' },
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
    // OBLIGATORIO en MSAL v3+: inicializar y procesar el regreso del login ANTES del primer render
    provideAppInitializer(async () => {
      const msal = inject(MSAL_INSTANCE) as IPublicClientApplication;
      await msal.initialize();
      try {
        const result = await msal.handleRedirectPromise();
        // La cuenta que acaba de iniciar sesión pasa a ser la activa (si no, se usaría una vieja de la caché)
        if (result?.account) {
          msal.setActiveAccount(result.account);
        }
      } catch (error) {
        // Login cancelado o fallido en Microsoft (p. ej. AADB2C90091): la app arranca igual y muestra la bienvenida
        console.warn('No se completó el inicio de sesión:', error);
      }
    }),
    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ],
};