import { Configuration, LogLevel } from '@azure/msal-browser';

// Tenant donde están registrados frontend-campuslab y ms-campuslab-bff.
// Debe ser el MISMO tenant del issuer-uri del BFF (application.yaml). Verifícalo en Entra ID > Información general.
const TENANT_ID = 'aff2eb38-d6cf-4220-8527-53f1cb6aed15';
const CLIENT_ID = '718a6ef2-45a4-4f06-84c9-6f54de8c3514';
const BFF_SCOPE = 'api://8d19bb45-1842-43ce-b76c-4513b979df81/access_as_user';

// Todo sale por el mismo origen HTTPS (ngrok -> nginx -> /api -> BFF)
const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
// URL base de la API: por defecto el mismo origen (nginx -> /api -> BFF). Si el contenedor define
// API_BASE_URL (p. ej. el API Gateway de AWS), llega en tiempo de ejecución por env.js (window.__env).
const runtimeApiBase: string = (typeof window !== 'undefined' && (window as any).__env?.apiBaseUrl) || '';
export const apiBaseUrl = (runtimeApiBase || origin).replace(/\/+$/, '');
const bffBaseUrl = `${apiBaseUrl}/api/bff`;

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
  production: true,
  msalConfig,
  protectedResources,
  apiConfig,
  bffUrl,
  apiBaseUrl,
  azure: { clientId: CLIENT_ID, tenantId: TENANT_ID, redirectUri: `${origin}/` },
};