#!/bin/sh
# Genera env.js con la URL base de la API al arrancar el contenedor (sin recompilar Angular).
# API_BASE_URL vacía = mismo origen; con valor = el frontend llama a esa URL (p. ej. el API Gateway).
set -e
cat > /usr/share/nginx/html/env.js <<EOF
window.__env = { apiBaseUrl: "${API_BASE_URL:-}" };
EOF
echo "campuslab: API_BASE_URL=${API_BASE_URL:-(mismo origen)}"
