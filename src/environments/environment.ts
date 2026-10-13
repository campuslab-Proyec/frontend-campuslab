import { Configuration, LogLevel } from '@azure/msal-browser';

// Detecta automáticamente http://localhost/ o la IP/dominio del servidor actual (ej. http://3.90.143.94)
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const bffBaseUrl = `http://${currentHost}:8080/api/bff`;

export const msalConfig: Configuration = {
  auth: {
    clientId: '65c89996-b6aa-4d5a-8431-4a8ae3bc606b',
    authority: 'https://login.microsoftonline.com/aff2eb38-d6cf-4220-8527-53f1cb6aed15',
    redirectUri: `${currentOrigin}/`,
    postLogoutRedirectUri: `${currentOrigin}/`
  },
  cache: {
    cacheLocation: 'localStorage'
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false
    }
  }
};

export const protectedResources = {
  bffApi: {
    endpoint: `${bffBaseUrl}/`,
    scopes: ['api://8d19bb45-1842-43ce-b76c-4513b979df81/access_as_user']
  }
};

export const apiConfig = {
  scopes: ['api://8d19bb45-1842-43ce-b76c-4513b979df81/access_as_user'],
  uri: `${bffBaseUrl}/`
};

export const bffUrl = bffBaseUrl;

export const environment = {
  production: true,
  msalConfig,
  protectedResources,
  apiConfig,
  bffUrl,
  azure: {
    clientId: '65c89996-b6aa-4d5a-8431-4a8ae3bc606b',
    tenantId: 'aff2eb38-d6cf-4220-8527-53f1cb6aed15',
    redirectUri: 'http://3.90.143.94'
  }
};