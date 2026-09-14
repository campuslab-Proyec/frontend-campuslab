# Etapa 1: Compilación de Angular
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

# Etapa 2: Servidor Web Nginx
FROM nginx:alpine
# Asegúrate de que la ruta /app/dist coincida con el output en tu angular.json
COPY --from=build /app/dist/ngfrontend-campuslab/browser /usr/share/nginx/html
# Configuración para que el router de Angular funcione al recargar la página
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
