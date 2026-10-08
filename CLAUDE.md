# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visión general

Resttek: plataforma de gestión de restaurantes. Monorepo con **npm workspaces** (`packages/*`): una API (`@resttek/api`, Express 5 + TypeScript + SQLite) y cuatro paquetes Angular 21 (`web-admin`, `web-empleados`, `web-clientes` y la librería `web-shared`). La documentación detallada está en `docs/` (arquitectura, dominio, y revisiones de inconsistencias conocidas); el README está en español.

## Comandos

Todo se ejecuta desde la raíz (Node 22+, npm 10+):

```bash
npm install            # instala todos los workspaces
npm run seed           # puebla SQLite (idempotente, INSERT OR IGNORE)
npm run dev:api        # API en :3000 (tsx watch); health: GET /health
npm run dev:admin      # :4200
npm run dev:empleados  # :4201
npm run dev:clientes   # :4202
npm test               # solo tests de la API (vitest run)
```

Un solo test de la API:

```bash
cd packages/api
npx vitest run src/services/order.service.test.ts
npx vitest run -t "nombre del test"
npm run test:watch
```

No hay lint ni tests configurados para los frontends; solo `ng build`/`ng serve` dentro de cada paquete. Los datos de prueba usan como contraseña el propio email (p. ej. `admin@resttek.com`).

## Arquitectura

### API (`packages/api/src`) — dos estilos conviven

- **Hexagonal + DDD solo en `contexts/employee`** (domain → application → infrastructure). `Employee` es la única entidad de dominio real (constructor privado + `create()`); hay tres casos de uso (`LoginUseCase`, `CreateEmployeeUseCase`, `RegisterClientUseCase`) con un método `execute()`. Interfaces con prefijo `I` (`IEmployeeRepository`). `contexts/shared` contiene el value object `Email`, middlewares (`authenticate`, `authorize`) y `errorHandler`.
- **Por capas para `restaurant`, `dish`, `ingredient`, `order`**: carpetas transversales `models/`, `repositories/`, `services/`, `controllers/`, `routes/`. Los modelos son interfaces planas; la validación vive en los servicios y en funciones `normalizeX()` de `models/` (unidad, categoría, estado de pedido). La interfaz del repositorio (sin prefijo `I`) convive con su implementación SQLite en el mismo fichero. Las rutas componen las dependencias.
- Errores de dominio en `errors/` (`AppError`, `DomainErrors`), traducidos a HTTP por `errorHandler`.
- Los repositorios tienen mocks en `mocks/` para tests unitarios de servicios/casos de uso.
- BD: `packages/api/resttek.db`; las tablas se crean al arrancar (migraciones en código, `config/database.ts`). Con `NODE_ENV=test` se usa `:memory:`.
- Auth: JWT + bcrypt; el frontend guarda el token en localStorage.

### Frontends

- Standalone components, signals, **zoneless**, guards/interceptors funcionales. RxJS solo para HTTP.
- `web-admin` y `web-empleados`: features con `models/ pages/ services/ store/`; los stores (signals privadas `loading/error/datos` + `firstValueFrom`) son el único punto de contacto de los componentes. `OrderStore` de empleados hace polling cada 30 s.
- `web-clientes` es distinta: modelos/servicios/store centralizados en `core/`, componentes sueltos en `features/`, y los componentes consumen los `Observable` con `.subscribe()`. Su componente raíz se llama `App`, no `AppComponent`.
- `@resttek/web-shared` (`src/index.ts`, consumido como TS fuente, sin build) aporta auth, interceptors y componentes comunes; los frontends no dependen entre sí. Los cambios en él requieren reiniciar el dev server.
- Cada frontend tiene `proxy.conf.json` que redirige `/api` a `http://localhost:3000`; la API vive bajo `/api/v1/...`.

### Dominio

Roles: admin, manager, camarero, cocinero, cliente. Estados de pedido: pendiente → preparando → listo → entregado. Consulta `docs/dominio/glosario.md` y `docs/dominio/modelo-datos.md` antes de tocar el esquema; `docs/revisiones/` lista inconsistencias ya detectadas entre código y documentación.
