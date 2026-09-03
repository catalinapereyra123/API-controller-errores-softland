# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# node_modules completo (incluye la CLI de prisma para el `db push` del arranque)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# En dev sincronizamos el schema con `db push` (no hay carpeta de migraciones).
# Para producción: crear migraciones con `prisma migrate dev` y usar `migrate deploy`.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main.js"]
