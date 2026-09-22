# XTOBE AI PC Admin Model Signature XTOBE-AI-PC-ADMIN-v2 Render Ready

## Deploy
render.yaml included
healthCheckPath /health
binds 0.0.0.0 + process.env.PORT

## ENV sync false
ADMIN_PASSWORD, LICENSE_SECRET, WHATSAPP_APP_SECRET, SESSION_SECRET, JWT_SECRET

## Smoke
curl /health returns {status:ok}
