import { ApplicationConfig, provideZonelessChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';

import {
    IPublicClientApplication,
    PublicClientApplication,
    InteractionType,
    BrowserCacheLocation
} from '@azure/msal-browser';

import {
    MsalGuard,
    MsalInterceptor,
    MSAL_INSTANCE,
    MSAL_GUARD_CONFIG,
    MSAL_INTERCEPTOR_CONFIG,
    MsalGuardConfiguration,
    MsalInterceptorConfiguration,
    MsalService,
    MsalBroadcastService
} from '@azure/msal-angular';

export function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: '718a6ef2-45a4-4f06-84c9-6f54de8c3514',
            authority: 'https://login.microsoftonline.com/aff2eb38-d6cf-4220-8527-53f1cb6aed15',
            redirectUri: 'http://localhost:4200',
            postLogoutRedirectUri: 'http://localhost:4200'
        },
        cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage
        }
    });
}
// Configuración de MsalGuard (para proteger rutas)
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Redirect,
        authRequest: {
            scopes: ['user.read']
        }
    };
}

// Configuración de MsalInterceptor (adjunta el token automáticamente a la API)
// Configuración de MsalInterceptor (adjunta el token automáticamente a la API)
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();
    
    // Adjunta el token a las llamadas al BFF / API Gateway
    protectedResourceMap.set('http://localhost:8080/api/*', [
        'api://8d19bb45-1842-43ce-b76c-4513b979df81/access_as_user'
    ]);
    
    // Permiso básico para Microsoft Graph si lo requieres
    protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);

    return {
        interactionType: InteractionType.Redirect,
        protectedResourceMap
    };
}
export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(
            withInterceptorsFromDi()
        ),
        {
            provide: MSAL_INSTANCE,
            useFactory: MSALInstanceFactory
        },
        provideAppInitializer(async () => {
            const msalInstance = inject(MSAL_INSTANCE) as IPublicClientApplication;
            await msalInstance.initialize();
            await msalInstance.handleRedirectPromise();
        }),
        {
            provide: MSAL_GUARD_CONFIG,
            useFactory: MSALGuardConfigFactory
        },
        {
            provide: MSAL_INTERCEPTOR_CONFIG,
            useFactory: MSALInterceptorConfigFactory
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true
        },
        MsalService,
        MsalGuard,
        MsalBroadcastService
    ]
};