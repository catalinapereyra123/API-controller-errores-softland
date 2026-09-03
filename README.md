# API Errores Softland

Tablero para gestionar los errores de integración de Softland.
`backend/` (NestJS + Prisma + Postgres) · `frontend/` (React + Vite).

## Levantar todo con Docker

Requiere Docker Desktop corriendo.

```bash
docker compose up -d --build
```

| Servicio   | URL                         | Notas                                  |
| ---------- | --------------------------- | -------------------------------------- |
| front      | http://localhost:5173       | build de Vite servido por nginx        |
| backend    | http://localhost:3000       | Nest; sincroniza el schema al arrancar |
| db         | localhost:**5433**          | Postgres 17 (`postgres` / `postgres`)  |

El backend corre `prisma db push` al arrancar, así que las tablas se crean solas.
Los datos persisten en el volumen `db-data`.

```bash
docker compose logs -f backend     # ver logs
docker compose down                # frenar (mantiene los datos)
docker compose down -v             # frenar y BORRAR la base
```

### Conectarse a la base desde la máquina

```
postgresql://postgres:postgres@localhost:5433/errores_softland
```

(desde adentro de la red de compose es `db:5432`).

## Desarrollo sin Docker

Ver [`backend/README.md`](backend/README.md). Necesitás un Postgres propio y
correr `npx prisma migrate dev` (o `db push`) contra él.

## Migraciones de Prisma

El compose usa `db push` (sin historial de migraciones) porque alcanza para dev.
Para versionar el schema:

```bash
cd backend
npx prisma migrate dev --name <nombre>   # contra la DB del compose en :5433
```

y cambiar el `CMD` del `backend/Dockerfile` a `prisma migrate deploy`.
