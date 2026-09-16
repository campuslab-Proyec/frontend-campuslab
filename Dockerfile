<<<<<<< HEAD
=======
# Etapa 1: Compilación de Angular
>>>>>>> 17f2986bd85ded55dda122e737f9d0dc34fa841b
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

FROM nginx:alpine
# Copia el compilado de ngfrontend-campuslab (si Angular genera /browser lo usará, si no usará la raíz del dist)
COPY --from=build /app/dist/ngfrontend-campuslab/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
