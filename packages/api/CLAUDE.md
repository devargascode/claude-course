# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Paquete

`@resttek/api`: API REST en Express 5 + TypeScript (ESM, `"type": "module"`) con SQLite. Forma parte del monorepo Resttek; los comandos de la raíz (`npm run dev:api`, `npm test`, `npm run seed`) delegan aquí.

## Comandos

Desde `packages/api`:

```bash
npm run dev           # tsx watch src/server.ts, puerto 3000 (o PORT)
npm test              # vitest run
npm run test:watch
npm run seed          # src/scripts/seed.ts, idempotente (INSERT OR IGNORE)
npx vitest run src/services/order.service.test.ts   # un solo fichero
npx vitest run -t "nombre del test"                 # un solo test
```

No hay script de build ni de lint: se ejecuta con `tsx` directamente.

## Convenciones técnicas

- **Imports con alias** definidos en `tsconfig.json` (`@employee/*`, `@shared/*`, `@routes/*`, `@services/*`, `@repositories/*`, `@models/*`, `@controllers/*`, `@errors/*`, `@config/*`, `@scripts/*`). Vitest los resuelve con `vite-tsconfig-paths`.
- Los imports relativos y con alias **terminan en `.js`** (`nodenext`), aunque el fichero sea `.ts`.
- `tsconfig` estricto: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (usa `import type` para tipos).
- Los tests viven junto al código (`*.test.ts`) y usan `globals: true` de vitest, sin imports de `describe/it`.

## Arquitectura

Conviven dos estilos; identifica cuál aplica antes de editar:

- **`src/contexts/employee/`**: hexagonal + DDD (`domain/`, `application/`, `infrastructure/`). Los casos de uso tienen un único `execute()`. La composición de dependencias está en `infrastructure/http/dependencies.ts`. Los tests de casos de uso usan `application/mocks/MockDependencies.ts`.
- **`restaurant`, `dish`, `ingredient`, `order`**: carpetas por tipo (`models/`, `repositories/`, `services/`, `controllers/`, `routes/`). Los repositorios mock para tests están en `repositories/mocks/`. La interfaz del repositorio se declara en el mismo fichero que su implementación SQLite.
- `contexts/shared/` guarda `Email`, los middlewares `authenticate`/`authorize` (JWT, con `JWT_SECRET` o un valor por defecto de desarrollo) y `errorHandler`.

`src/app.ts` monta todas las rutas bajo `/api/v1` (rutas públicas en `/api/v1/public/restaurants`, rutas anidadas por `:restaurantId`) y expone `GET /health`. `src/server.ts` inicializa la BD y escucha.

## Base de datos

`src/config/database.ts` envuelve `sqlite3` en una clase `Database` (`run`, `all`, `get`, promesas) y ejecuta las migraciones en `runInitialMigrations()` al arrancar. El fichero es `packages/api/resttek.db`; con `NODE_ENV=test` usa `:memory:`. Las claves foráneas están activadas (`PRAGMA foreign_keys = ON`).

## Errores

Los errores de dominio extienden `AppError` (`src/errors/`) y `errorHandler` los convierte en respuestas HTTP. Lanza el error de dominio correspondiente en vez de responder manualmente desde servicios o casos de uso.
