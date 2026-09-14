---

### 3. `README.md` para el Frontend (ejemplo en React / Angular / Vue)

> *Ajusta este README según el framework Frontend exacto que utilices en tu proyecto.*

```markdown
# CampusLab Frontend

Aplicación cliente de interfaz gráfica que permite a los usuarios interactuar con la plataforma CampusLab para gestionar y consultar laboratorios y recursos.

## 🛠️ Tecnologías Utilizadas

* **Node.js** (v18+)
* **Framework Web:** React / Angular / Vue.js / HTML5 + JavaScript (ES6+)
* **Axios / Fetch API** (Consumo del microservicio BFF)
* **Gestor de Paquetes:** npm / yarn / pnpm

## 📋 Requisitos Previos

1. **Node.js** v18.0.0 o superior instalado.
2. **npm** (o el gestor de paquetes de tu preferencia).
3. El microservicio **`ms-campuslab-bff`** ejecutándose en `http://localhost:8080`.

## 🚀 Instalación y Ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd campuslab-frontend
Instalar dependencias:

Bash
npm install
Configurar variables de entorno:
Crea un archivo .env en la raíz con la dirección del BFF:

Fragmento de código
VITE_API_URL=http://localhost:8080
# O REACT_APP_API_URL=http://localhost:8080
Ejecutar en entorno de desarrollo:

Bash
npm run dev
# o npm start
La aplicación frontend estará disponible por defecto en: http://localhost:5173 o http://localhost:3000