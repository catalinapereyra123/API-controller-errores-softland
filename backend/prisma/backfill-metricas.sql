-- Reconstruye los hitos de Métricas (EventoMetrica) para los errores que ya
-- existían antes de que se empezaran a registrar. Es idempotente: cada fila
-- lleva un id derivado ("bf_<tipo>_<id de origen>") y ON CONFLICT la saltea,
-- así que se puede correr más de una vez.
--
--   npx prisma db execute --file prisma/backfill-metricas.sql
--
-- Lo que no se puede reconstruir exacto: las reapariciones, y el autor de
-- una asignación hecha a alguien que después cambió de nombre.

-- LLEGADA: la detección de cada error.
INSERT INTO "EventoMetrica" (id, tipo, "transaccionId", "empresaCodigo", modulo, "minutosDesdeDeteccion", "createdAt")
SELECT 'bf_ll_' || t.id, 'LLEGADA', t.id, t."empresaCodigo", t.modulo, 0, t."fechaDeteccion"
FROM "TransaccionError" t
WHERE NOT EXISTS (
  SELECT 1 FROM "EventoMetrica" m WHERE m."transaccionId" = t.id AND m.tipo = 'LLEGADA'
)
ON CONFLICT (id) DO NOTHING;

-- ASIGNACION: los eventos de trazabilidad "Asignado a <nombre>".
INSERT INTO "EventoMetrica" (id, tipo, "transaccionId", "empresaCodigo", modulo, "usuarioId", "usuarioNombre", "minutosDesdeDeteccion", "createdAt")
SELECT 'bf_as_' || e.id, 'ASIGNACION', t.id, t."empresaCodigo", t.modulo,
       u.id, substring(e.titulo FROM 12),
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (e."createdAt" - t."fechaDeteccion")) / 60))::int,
       e."createdAt"
FROM "EventoTrazabilidad" e
JOIN "TransaccionError" t ON t.id = e."transaccionId"
LEFT JOIN "Usuario" u ON u.nombre = substring(e.titulo FROM 12)
WHERE e.tipo = 'asignacion' AND e.titulo LIKE 'Asignado a %'
ON CONFLICT (id) DO NOTHING;

-- CORRECCION: cada intento de reproceso.
INSERT INTO "EventoMetrica" (id, tipo, "transaccionId", "empresaCodigo", modulo, "usuarioId", "usuarioNombre", "minutosDesdeDeteccion", "createdAt")
SELECT 'bf_co_' || i.id, 'CORRECCION', t.id, t."empresaCodigo", t.modulo,
       i."usuarioId", i."usuarioNombre",
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (i."createdAt" - t."fechaDeteccion")) / 60))::int,
       i."createdAt"
FROM "ErrorIntento" i
JOIN "TransaccionError" t ON t.id = i."errorId"
ON CONFLICT (id) DO NOTHING;

-- FALLO_REPROCESO: intentos cerrados que no quedaron en S.
INSERT INTO "EventoMetrica" (id, tipo, "transaccionId", "empresaCodigo", modulo, "usuarioId", "usuarioNombre", "minutosDesdeDeteccion", "createdAt")
SELECT 'bf_fa_' || i.id, 'FALLO_REPROCESO', t.id, t."empresaCodigo", t.modulo,
       i."usuarioId", i."usuarioNombre",
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (i."cerradoAt" - t."fechaDeteccion")) / 60))::int,
       i."cerradoAt"
FROM "ErrorIntento" i
JOIN "TransaccionError" t ON t.id = i."errorId"
WHERE i."cerradoAt" IS NOT NULL AND i."statusDespues" IS DISTINCT FROM 'S'
ON CONFLICT (id) DO NOTHING;

-- RESOLUCION: los resueltos, con su origen y quién los había corregido.
INSERT INTO "EventoMetrica" (id, tipo, "transaccionId", "empresaCodigo", modulo, "usuarioId", "usuarioNombre", "origenCierre", "minutosDesdeDeteccion", "createdAt")
SELECT 'bf_re_' || t.id, 'RESOLUCION', t.id, t."empresaCodigo", t.modulo,
       CASE WHEN t."origenCierre" = 'MANUAL' THEN t."corregidoPorId" END,
       CASE WHEN t."origenCierre" = 'MANUAL' THEN t."corregidoPorNombre" END,
       t."origenCierre",
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (t."fechaResolucion" - t."fechaDeteccion")) / 60))::int,
       t."fechaResolucion"
FROM "TransaccionError" t
WHERE t."estadoApp" = 'RESUELTO' AND t."fechaResolucion" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "EventoMetrica" m WHERE m."transaccionId" = t.id AND m.tipo = 'RESOLUCION'
  )
ON CONFLICT (id) DO NOTHING;

-- DESCARTE: los eventos "Estado: Descartado" (el autor va en el detalle).
INSERT INTO "EventoMetrica" (id, tipo, "transaccionId", "empresaCodigo", modulo, "minutosDesdeDeteccion", "createdAt")
SELECT 'bf_de_' || e.id, 'DESCARTE', t.id, t."empresaCodigo", t.modulo,
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (e."createdAt" - t."fechaDeteccion")) / 60))::int,
       e."createdAt"
FROM "EventoTrazabilidad" e
JOIN "TransaccionError" t ON t.id = e."transaccionId"
WHERE e.titulo = 'Estado: Descartado'
ON CONFLICT (id) DO NOTHING;
