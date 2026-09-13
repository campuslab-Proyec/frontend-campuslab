export const environment = {
  production: false,
  bffUrl: 'http://localhost:8080/api/bff',
  azureAd: {
    clientId: '8d19bb45-1842-43ce-b76c-4513b979df81',
    tenantId: 'aff2eb38-d6cf-4220-8527-53f1cb6aed15',
    redirectUri: 'http://localhost:4200/login',
    authority: 'https://login.microsoftonline.com/aff2eb38-d6cf-4220-8527-53f1cb6aed15'
  }
};