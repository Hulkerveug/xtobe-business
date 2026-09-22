# Xtobe 2

A public-safe demo and deployment-ready starter for the Xtobe clinic AI platform.

## Public repo status
This repository is intended for public sharing and demo use.

Important rules:
- Never commit real secrets or production credentials.
- Keep live API keys in your deployment provider secret store, not in Git.
- Use the sample values in [.env.example](.env.example) only.
- Keep production and connector workflows in a private repo if they include live integrations.

## Run locally
1. Copy [.env.example](.env.example) to a private local file named .env
2. Fill in your local placeholder values only
3. Install dependencies with npm install
4. Start the app with npm start

## Deployment
The project includes [render.yaml](render.yaml) for Render deployment. Set the following secrets in your hosting dashboard instead of storing them in Git:
- ADMIN_PASSWORD
- LICENSE_SECRET
- WHATSAPP_APP_SECRET
- SESSION_SECRET
- JWT_SECRET
- WHATSAPP_TOKEN
- AI_API_KEY

## Health check
Use the /health endpoint to verify the service is running.

## Notes
This repo is intentionally kept demo-safe and should not include live platform tokens, production database files, or private bridge credentials.
