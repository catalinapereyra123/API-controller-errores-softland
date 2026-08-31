# Backend · API Errores Softland

NestJS + Prisma (PostgreSQL). n8n orquesta a Softland; **esta DB es la fuente de
verdad del histórico funcional** (estado, intentos, quién corrigió qué).

## Puesta en marcha

```bash
npm install
cp .env.example .env          # completar DATABASE_URL
npx prisma generate
npx prisma migrate dev --name init   # crea las tablas
npm run start:dev
```

Variables (`.env`):

| Variable                   | Para qué                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`             | Conexión Postgres (Prisma).                                         |
| `PORT`                     | Puerto HTTP (default 3000).                                         |
| `CORS_ORIGIN`              | Orígenes permitidos, coma-separado (ej. `http://localhost:5173`).   |
| `INGEST_API_KEY`           | Clave que n8n manda en `x-api-key`. Vacío = endpoints n8n abiertos. |
| `N8N_REPROCESO_WEBHOOK_URL` | Webhook de n8n para el flujo 2 (disparar el `UPDATE ... STATUS='N'`). |

## Los 4 flujos de n8n

```
FLUJO 1 · SYNC          CRON 3h → traer errores de todas las empresas
                        → POST /errores/sync  (array completo en 1 POST)

FLUJO 2 · REPROCESAR    app: POST /errores/:id/reproceso
                        → backend guarda REPROCESANDO + POST al webhook n8n
                        → n8n switch por módulo → UPDATE SAR_xxRMVH SET STATUS='N'

FLUJO 3 · PROCESAR      (2ª etapa) ejecutar USR_CO / USR_FC / USR_RC en Softland

FLUJO 4 · VERIFICAR     n8n consulta el status del identi en Softland
                        → POST /errores/resultado-reproceso
```

### Flujo 1 — `POST /errores/sync`  (header `x-api-key`)

```json
[
  { "empresa": "IFLOW", "empresaNombre": "I FLOW S.A.", "modulo": "3. Compras",
    "identi": "LIQ29948", "statusSoftland": "E", "error": "Se ha producido...",
    "cuenta": "9167", "fecha": "2026-08-11T00:00:00" }
]
```

- n8n manda **todos** los errores en un solo POST (hace falta el array completo
  para detectar los que ya no están).
- **Upsert** por `(empresa, modulo, identi)`. No pisa `estadoApp`, `responsable`,
  `intentos`, observaciones.
- `RESUELTO` que vuelve a llegar con error → se reabre (`ERROR`).
- `REPROCESANDO` + `statusSoftland=S` explícito en el feed → `RESUELTO`.
- `REPROCESANDO` + vuelve a `E/D/B/X` → `REQUIERE_CORRECCION`.
- `REPROCESANDO` + **desaparece del feed** → NO se resuelve solo (desaparecer no
  prueba `S`: pudo pasar a `N` u otro estado). Se marca `reprocesoDesaparecioAt`
  como **alarma**; la verdad la trae el flujo 4.
- `modulo` se normaliza: `1.→FACTURACION`, `2.→COBRANZAS`, `3.→COMPRAS`. Lo no
  reconocido se ignora y se reporta en `detalleIgnorados`.

Respuesta: `{ recibidos, empresas, creados, actualizados, reaparecidos,
reprocesadosOk, regresiones, reprocesandoSinConfirmar, ignorados, desaparecidos,
detalleIgnorados, procesadoEn }`.

### Flujo 2 — `POST /errores/:id/reproceso`  (desde la app)

Body: `{ observacion?, autorId? }`. El backend:
`estadoApp = REPROCESANDO`, `corregidoPor`, `fechaCorreccion`, `intentos++`,
crea un `ErrorIntento`, evento de trazabilidad, y **POST al webhook de n8n**
(`{ empresa, modulo, moduloCodigo, identi }`). Si el webhook falla, queda en
`GET /errores/reproceso-pendientes` para que n8n lo levante igual.

### Flujo 4 — `POST /errores/resultado-reproceso`  (header `x-api-key`)

```json
{ "empresa": "IFLOW", "modulo": "3. Compras", "identi": "LIQ29948",
  "statusSoftland": "S", "error": "nuevo ERRMSG si volvió a fallar" }
```

- `S` → `estadoApp = RESUELTO`, `fechaResolucion`, cierra el `ErrorIntento`.
- `E / B / D / X` → `estadoApp = REQUIERE_CORRECCION`, guarda el nuevo `errorMensaje`.
- `N` → sin cambios (sigue procesándose).

## Lectura (front)

| Método | Ruta                            | Devuelve                                                     |
| ------ | ------------------------------- | ----------------------------------------------------------- |
| GET    | `/errores`                      | Bandeja plana (tipo `ErrorTransaccion` del front).          |
| GET    | `/errores/agrupados`            | `[{ empresa, totalErrores, totalesPorModulo, modulos[] }]`. |
| GET    | `/errores/reproceso-pendientes` | Reprocesos en curso (fallback del webhook para n8n).        |
| GET    | `/errores/:id`                  | Detalle + observaciones + trazabilidad + intentos.          |
| GET    | `/empresas`                     | `[{ id, nombre }]`.                                         |
| GET    | `/dashboard/stats`              | Métricas del dashboard (`DashboardStats`).                  |
| GET    | `/users`, `/users/me`           | Usuarios (se crean al registrarse; auth pendiente).        |

Filtros (query params) para `/errores` y `/errores/agrupados`: `empresa`,
`modulo` (`FACTURACION|COMPRAS|COBRANZAS`), `estado`
(`ERROR|ASIGNADO|EN_PROGRESO|REPROCESANDO|REQUIERE_CORRECCION|RESUELTO`),
`responsableId` (`sin-asignar`), `soloAbiertos` (`true` por default).

## Mutaciones (desde la app — se guardan en la DB)

| Método | Ruta                         | Body                                          |
| ------ | ---------------------------- | --------------------------------------------- |
| PATCH  | `/errores/:id/asignacion`    | `{ responsableId?: string \| null, autorId? }` |
| PATCH  | `/errores/:id/estado`        | `{ estado, nota?, autorId? }` — solo `ERROR`, `ASIGNADO`, `EN_PROGRESO` |
| POST   | `/errores/:id/observaciones` | `{ texto, autorId? }`                         |
| POST   | `/errores/:id/reproceso`     | `{ observacion?, autorId? }`                  |

`REPROCESANDO`, `REQUIERE_CORRECCION` y `RESUELTO` **no** se setean a mano: los
controla el flujo de reproceso (`RESUELTO` viene de `statusSoftland = S`).
`autorId` es provisorio hasta que exista auth (sin él, el evento queda como "Sistema").

## Modelo

`TransaccionError` (empresa + modulo + identi como clave natural) con
`estadoApp`, `statusSoftland`, `errorMensaje`, `intentos`, `fechaCorreccion`,
`fechaDeteccion`, `fechaResolucion`, y `corregidoPorId` (FK a `Usuario`) +
`corregidoPorNombre` (snapshot que sobrevive si el usuario cambia de nombre).
`ErrorIntento` (histórico de reprocesos: `numeroIntento`, `statusAntes`,
`statusDespues`, `usuarioId`, `usuarioNombre`, `observacion`, `cerradoAt`).
`Observacion`, `EventoTrazabilidad`, `Empresa`, `Usuario`.

## Estructura

```
src/
  common/api-key.guard.ts     Guard de los endpoints de n8n (x-api-key)
  errores/
    dto/                      SyncError, ResultadoReproceso, QueryErrores, Mutaciones
    sync.controller.ts        POST /errores/sync, POST /errores/resultado-reproceso
    errores.controller.ts     GET de lectura + PATCH/POST de mutación
    errores.service.ts        Lógica de los 4 flujos + armado por empresa/módulo
    errores.repository.ts     Acceso a datos (Prisma)
    errores.mapper.ts         Normalización de módulo + forma para el front
  usuarios/                   /users, /users/me
prisma/schema.prisma          Modelo
```

## Tests

```bash
npm test        # sync (idempotencia, reproceso), resultado-reproceso, mapper — sin DB
```
