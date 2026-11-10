# IRIS

**I**ntegraciones, **R**eprocesos e **I**ncidencias de **S**oftland: tablero
para gestionar los errores de integración de Softland.
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

## Ingreso con Microsoft (SSO)

Con el SSO configurado el login muestra **sólo** "Ingresar con Microsoft"
(cuenta de Outlook corporativo, Microsoft Entra ID) y el backend corta el login
con contraseña y el registro. Sin las variables de Azure (local) queda email y
contraseña.

Flujo (app **Web** de Azure, con client secret; el secret nunca sale del backend):

1. El botón navega a `GET /auth/microsoft/login`: el backend deja una cookie
   con `state`, `nonce` y el verificador PKCE y redirige a Microsoft.
2. Microsoft vuelve a `GET /auth/microsoft/callback` (la Redirect URI). El
   backend chequea el `state` contra la cookie, canjea el `code` con el secret,
   valida el ID token (firma, audiencia, tenant, vencimiento, nonce) y busca o
   crea al usuario (por Object ID; la primera vez lo vincula por email).
3. Redirige al front con `?ms=<código de un solo uso>` (vive 1 minuto).
4. El front lo canjea en `POST /auth/microsoft/sesion` por la sesión de
   siempre (nuestro JWT). Si algo falla vuelve con `?ms_error=<mensaje>`.

### Variables (backend)

| Variable | De dónde sale en Azure (App registration) |
| --- | --- |
| `AZURE_TENANT_ID` | Overview → **Directory (tenant) ID** |
| `AZURE_CLIENT_ID` | Overview → **Application (client) ID** |
| `AZURE_CLIENT_SECRET` | Certificates & secrets → columna **Value** (no el *Secret ID*). Es secreto. |
| `AZURE_REDIRECT_URI` | Authentication → la Redirect URI, idéntica. Prod: `https://iris.iflow21.com/api/auth/microsoft/callback` |
| `FRONTEND_URL` | Sólo en local (`http://localhost:5173`). En prod se usa el dominio de la Redirect URI. |

En Coolify van en las Environment Variables del recurso (el compose ya las
pasa al backend); después, redeploy. El front no necesita nada.

El secret **vence** (Azure lo crea con fecha de expiración): cuando venza, el
canje falla con `AADSTS7000215` en los logs del backend; hay que generar uno
nuevo y reemplazar `AZURE_CLIENT_SECRET`.

Para probar en local hay que agregar en Azure la Redirect URI
`http://localhost:3000/auth/microsoft/callback`.

Opcional: para que no entre cualquier persona de la empresa, en
**Enterprise applications** → la app → **Properties** poner *Assignment
required* en **Yes** y en **Users and groups** asignar a quienes pueden usarla.
