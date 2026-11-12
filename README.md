# InvitaQR

SaaS de invitaciones y acceso por QR. La app de tiendas registra organizadores (`PLANNER`). Xalapasoft entra como `OWNER` sembrado al arrancar la API.

## Arranque

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:3000/health
- Swagger: http://localhost:3000/docs

`init.sql` solo corre la primera vez que se crea el volumen de Postgres. La cuenta OWNER usa `OWNER_EMAIL` y `OWNER_PASSWORD` del `.env`.
