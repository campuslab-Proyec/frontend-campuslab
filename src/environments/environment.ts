import { Configuration, LogLevel } from '@azure/msal-browser';

const ngrokUrl = 'https://handoff-sprint-protrude.ngrok-free.dev';

const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const bffBaseUrl = `http://${currentHost}:8080/api/bff`;

export const msalConfig: Configuration = {
  auth: {
    clientId: '718a6ef2-45a4-4f06-84c9-6f54de8c3514',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: `${ngrokUrl}/`,
    postLogoutRedirectUri: `${ngrokUrl}/`
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
    clientId: '718a6ef2-45a4-4f06-84c9-6f54de8c3514',
    tenantId: 'common', // Corregido a common
    redirectUri: `${ngrokUrl}/`
  }
};