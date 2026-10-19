// Configuración en tiempo de ejecución. En Docker la reescribe docker/40-campuslab-env.sh al arrancar
// el contenedor con la variable API_BASE_URL (por ejemplo, la URL del API Gateway de AWS).
// Vacía = el frontend llama a la API en su mismo origen (/api -> nginx -> BFF).
window.__env = window.__env || { apiBaseUrl: "" };
