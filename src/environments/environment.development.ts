import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: '718a6ef2-45a4-4f06-84c9-6f54de8c3514',
    authority: 'https://login.microsoftonline.com/aff2eb38-d6cf-4220-8527-53f1cb6aed15',
    redirectUri: 'http://localhost/',
    postLogoutRedirectUri: 'http://localhost/'
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
    endpoint: 'http://localhost:8080/api/bff/',
    scopes: ['api://718a6ef2-45a4-4f06-84c9-6f54de8c3514/access_as_user']
  }
};