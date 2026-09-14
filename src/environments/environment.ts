export const environment = {
  production: true,
  msalConfig: {
    auth: {
      clientId: '718a6ef2-45a4-4f06-84c9-6f54de8c3514',
      authority: 'https://login.microsoftonline.com/aff2eb38-d6cf-4220-8527-53f1cb6aed15',
      redirectUri: 'http://<TU-IP-O-DOMINIO-EC2>',
    },
  },
  apiConfig: {
    scopes: ['api://8d19bb45-1842-43ce-b76c-4513b979df81/access_as_user'],
    uri: 'http://<TU-IP-O-DOMINIO-EC2>:8080/api/bff/',
  },
  bffUrl: 'http://<TU-IP-O-DOMINIO-EC2>:8080/api/bff',
};
