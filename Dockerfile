# Etapa 1: compilación de Angular
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
# Ojo: con npm hay que usar "--" para pasar flags a ng build
RUN npx ng build --configuration=production
 
# Etapa 2: Nginx
FROM nginx:alpine
# Debe coincidir con "outputPath"/nombre del proyecto en angular.json
COPY --from=build /app/dist/ngfrontend-campuslab/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]