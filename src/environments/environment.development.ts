import { Configuration, LogLevel } from '@azure/msal-browser';

// Igual que environment.ts, pero para `ng serve`: las llamadas a /api las redirige proxy.conf.json
// al BFF en localhost:8080, así el MsalInterceptor (que protege `${origin}/api/*`) adjunta el token.
// Recuerda registrar http://localhost:4200 como Redirect URI (SPA) en Entra ID.
const TENANT_ID = 'aff2eb38-d6cf-4220-8527-53f1cb6aed15';
const CLIENT_ID = '718a6ef2-45a4-4f06-84c9-6f54de8c3514';
const BFF_SCOPE = 'api://8d19bb45-1842-43ce-b76c-4513b979df81/access_as_user';

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
const bffBaseUrl = `${origin}/api/bff`;

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: `${origin}/`,
    postLogoutRedirectUri: `${origin}/`,
  },
  cache: { cacheLocation: 'localStorage' },
  system: {
    loggerOptions: { logLevel: LogLevel.Info, piiLoggingEnabled: false },
  },
};

export const protectedResources = {
  bffApi: { endpoint: `${bffBaseUrl}/`, scopes: [BFF_SCOPE] },
};

export const apiConfig = { scopes: [BFF_SCOPE], uri: `${bffBaseUrl}/` };

export const bffUrl = bffBaseUrl;

export const environment = {
  production: false,
  msalConfig,
  protectedResources,
  apiConfig,
  bffUrl,
  azure: { clientId: CLIENT_ID, tenantId: TENANT_ID, redirectUri: `${origin}/` },
};
