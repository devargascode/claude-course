# Gestión de mesas

| | |
|---|---|
| **Issue** | [#6](https://github.com/devargascode/claude-course/issues/6) |
| **Estado** | Borrador |
| **Autor de la issue** | @devargascode |
| **Fecha** | 2026-10-08 |
| **Etiquetas** | `feature`, `proyecto:api`, `proyecto:web-admin`, `proyecto:web-empleados`, `proyecto:web-clientes` |

## 1. Contexto

Hoy un cliente elige restaurante y va directamente a la carta; el pedido se crea con `tableId: null` (`web-clientes/.../order.service.ts`). La tabla `orders` tiene una columna `table_id` sin ninguna entidad detrás, así que no existe el concepto de mesa, ni su estado, ni forma de que el personal sepa qué pedidos pertenecen a qué mesa.

La issue pide: (1) que el cliente indique el número de personas, vea las mesas libres con capacidad suficiente, elija una y, al continuar, la mesa pase a ocupada y se le lleve a la carta; (2) que el administrador gestione las mesas (CRUD) con `id`, `número`, `descripción`, `capacidad` y `estado` (libre, ocupada, reservada); (3) que los empleados vean y cambien el estado de las mesas y vean el estado de los pedidos de las mesas ocupadas.

La issue no tiene comentarios. El plan se divide por aplicación (API, admin, clientes, empleados) a petición del usuario.

## 2. Alcance

**Incluido**
- Entidad `Table` con CRUD para admin en la API.
- Consulta de mesas disponibles por aforo (cliente) y ocupación atómica de una mesa.
- Cambio de estado de mesa por empleados.
- Pedidos de las mesas ocupadas visibles para empleados (reutiliza `GET /orders/active`, que ya devuelve `tableId`).
- Pantallas en `web-admin`, `web-clientes` y `web-empleados`; seed y documentación del modelo de datos.

**Excluido**
- Liberar la mesa automáticamente al entregar todo el pedido o al pagar: la issue no lo pide; la libera el personal a mano.
- Sistema de reservas (fechas, horas, cliente que reserva): `reservada` es solo un estado manual.
- Validar en `OrderService` que `tableId` exista u esté ocupada: se deja como pregunta abierta (ver sección 9).
- Notificaciones en tiempo real: se reutiliza el polling de 30 s existente.

## 3. Comportamiento esperado

### 3.1 Cliente elige mesa

**Dado** un cliente autenticado que ha elegido un restaurante
**Cuando** indica `N` personas
**Entonces** ve solo las mesas del restaurante con `estado = libre` y `capacidad >= N`, ordenadas por capacidad ascendente y luego número. Si no hay ninguna, ve "No hay mesas disponibles para N personas".

### 3.2 Cliente confirma mesa

**Dado** que el cliente ha seleccionado una mesa libre
**Cuando** pulsa "Continuar"
**Entonces** la API la marca `ocupada` (200) y el cliente navega a la carta con el `tableId` guardado; los pedidos que envíe llevan ese `tableId`.
Si entre medias otra persona la ocupó, la API responde `409 TableNotAvailableError` y la UI refresca la lista con el aviso "La mesa ya no está disponible".

### 3.3 Admin gestiona mesas

**Dado** un admin en `/restaurants/:id/tables`
**Cuando** crea, edita o elimina una mesa
**Entonces** la lista se actualiza. Crear con número repetido en el mismo restaurante → 400 `DuplicatedTableNumberError`. Eliminar una mesa `ocupada` → 400 `TableOccupiedError`.

### 3.4 Empleado ve y cambia estados

**Dado** un empleado (admin, manager, camarero o cocinero) en `/mesas`
**Cuando** abre la pantalla
**Entonces** ve todas las mesas del restaurante con su estado, y para las `ocupada` los pedidos activos con el estado de cada ítem (refresco cada 30 s). Puede cambiar el estado de una mesa a libre / ocupada / reservada.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `packages/api/src/models/table.model.ts` | Nuevo — interfaz `Table`, `normalizeTableStatus()` |
| `packages/api/src/errors/DomainErrors.ts` | Nuevos errores de mesa |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | `TableNotFoundError` → 404; `TableNotAvailableError` → 409 |
| `packages/api/src/config/database.ts` | Migración de la tabla `tables` |
| `packages/api/src/repositories/table.repository.ts` | Nuevo — interfaz + `SqliteTableRepository` |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | Nuevo — mock para tests |
| `packages/api/src/services/table.service.ts` (+ `.test.ts`) | Nuevo — CRUD, disponibles, ocupar, cambio de estado |
| `packages/api/src/controllers/table.controller.ts` | Nuevo |
| `packages/api/src/routes/table.routes.ts`, `table.public.routes.ts` | Nuevo — rutas autenticadas y públicas |
| `packages/api/src/app.ts` | Montaje de rutas |
| `packages/api/src/scripts/seed.ts` | Mesas de ejemplo |
| `docs/dominio/modelo-datos.md`, `glosario.md` | Documentar `tables` |
| `packages/web-admin/src/app/features/tables/**` | Nuevo — models/services/store/pages/routes |
| `packages/web-admin/src/app/app.routes.ts`, `restaurant-dashboard.component.ts` | Ruta y enlace a mesas |
| `packages/web-clientes/src/app/core/{models,services,store}/` | `table.model.ts`, `table.service.ts`, `tableId` en `CartStore`, `OrderService` envía `tableId` |
| `packages/web-clientes/src/app/features/tables/table-select.component.ts` | Nuevo — personas + mesas + continuar |
| `packages/web-clientes/src/app/app.routes.ts` | `restaurants/:id` → selección de mesa; `restaurants/:id/menu` → carta con guard |
| `packages/web-empleados/src/app/features/tables/**` | Nuevo — models/services/store/pages |
| `packages/web-empleados/src/app/app.routes.ts`, `core/layout/shell.component.ts` | Ruta y enlace "Mesas" |

### Enfoque

- API por capas, igual que `ingredient` (`models` → `repositories` → `services` → `controllers` → `routes`), no hexagonal. Rutas autenticadas en `/api/v1/restaurants/:restaurantId/tables` con `mergeParams`, como `ingredient.routes.ts`; consulta pública de disponibles en `/api/v1/public/restaurants/:restaurantId/tables/available?partySize=N`, como `dish.public.routes.ts`.
- Ocupar es atómico: `UPDATE tables SET status='ocupada' ... WHERE id=? AND status='libre'` y se comprueba `changes`; evita doble ocupación. Descartada la lectura + escritura separadas por la condición de carrera.
- `web-admin` y `web-empleados` siguen el patrón `models/ pages/ services/ store/` (precedente: `features/ingredients` y `OrderStore`). `web-clientes` sigue su estilo: modelos/servicios/store en `core/`, componente en `features/`, `.subscribe()`.

### Modelo de datos / contratos

```sql
CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'libre',
    restaurant_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(restaurant_id, number),
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
)
```

| Método y ruta | Roles | Descripción |
|---|---|---|
| `POST /restaurants/:rid/tables` | admin | Crear `{number, description?, capacity, status?}` → 201 |
| `GET /restaurants/:rid/tables` | admin, manager, camarero, cocinero | Listar |
| `GET /restaurants/:rid/tables/:id` | ídem | Detalle |
| `PUT /restaurants/:rid/tables/:id` | admin | Actualizar número, descripción, capacidad |
| `DELETE /restaurants/:rid/tables/:id` | admin | Borrar → 204 |
| `PATCH /restaurants/:rid/tables/:id/status` | admin, manager, camarero, cocinero | `{status}` |
| `GET /public/restaurants/:rid/tables/available?partySize=N` | público | Libres con capacidad ≥ N |
| `POST /restaurants/:rid/tables/:id/occupy` | cualquier autenticado | Ocupar si está libre, si no 409 |

Respuesta de mesa: `{ id, number, description, capacity, status, restaurantId, createdAt, updatedAt }`.

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| `capacity` ≤ 0 o no entero | 400 `InvalidTableCapacityError` |
| `number` ≤ 0 o repetido en el restaurante | 400 `InvalidTableNumberError` / `DuplicatedTableNumberError` |
| Estado fuera de libre/ocupada/reservada | 400 `InvalidTableStatusError` |
| Mesa inexistente | 404 `TableNotFoundError` |
| `partySize` ausente, no entero o < 1 | 400 `InvalidPartySizeError` |
| Ocupar mesa no libre (carrera) | 409 `TableNotAvailableError` |
| Borrar mesa `ocupada` | 400 `TableOccupiedError` |
| Cliente recarga la carta sin mesa elegida | Guard redirige a la selección de mesa |
| Empleado de otro restaurante | Fuera de alcance: el proyecto hoy no valida pertenencia al restaurante en ninguna ruta |

## 6. Plan de implementación

Cada tarea es un único cambio verificable de 5-10 min; el proyecto compila tras cada una. Orden: API → admin → empleados → clientes (clientes al final porque necesita `occupy` y los pedidos con `tableId`).

### 6.1 API (`packages/api`)

Tests con Vitest (`cd packages/api && npx vitest run`).

1. [ ] **API-1** Modelo `Table` y `normalizeTableStatus()` + errores `InvalidTableStatusError`, `TableNotFoundError`. Test: `table.model.test.ts` (acepta/normaliza, rechaza inválido). Ficheros: `models/table.model.ts`, `errors/DomainErrors.ts`.
2. [ ] **API-2** Migración `tables` en `database.ts`. Test: `table.repository.test.ts` (la tabla existe, `UNIQUE(restaurant_id, number)` se respeta, `:memory:`). Ficheros: `config/database.ts`, `repositories/table.repository.test.ts`.
3. [ ] **API-3** `SqliteTableRepository` (`findById`, `findByRestaurantId`, `save`, `delete`) + `MockTableRepository`. Test: `table.repository.test.ts` (round-trip). Ficheros: `repositories/table.repository.ts`, `repositories/mocks/MockTableRepository.ts`.
4. [ ] **API-4** `TableService.create` con validación (número > 0, capacidad entera > 0, estado por defecto `libre`) y `DuplicatedTableNumberError`, `InvalidTableNumberError`, `InvalidTableCapacityError`. Test: `table.service.test.ts`. Ficheros: `services/table.service.ts`, `errors/DomainErrors.ts`.
5. [ ] **API-5** `TableService.update`, `findById`, `findByRestaurantId` y `delete` (rechaza `ocupada` con `TableOccupiedError`; 404 si no existe). Test: `table.service.test.ts`.
6. [ ] **API-6** `TableService.updateStatus` (normaliza estado, 404 si no existe). Test: `table.service.test.ts`.
7. [ ] **API-7** `findAvailable(restaurantId, partySize)`: solo libres con capacidad ≥ N, ordenadas; `InvalidPartySizeError`. Test: `table.service.test.ts`. Ficheros: `services/table.service.ts`, repo/mock (`findAvailable`).
8. [ ] **API-8** `occupy(id)` atómico: método `occupyIfFree` en repositorio (`UPDATE ... WHERE status='libre'`) y `TableNotAvailableError`. Test: servicio con mock + repositorio SQLite (segunda ocupación falla).
9. [ ] **API-9** `errorHandler`: `TableNotFoundError` → 404, `TableNotAvailableError` → 409. Test: `errorHandler.test.ts` (nuevo, con supertest si está disponible; si no, invocando el handler con `res` simulado).
10. [ ] **API-10** `TableController` + `table.routes.ts` (CRUD y `PATCH status`, `occupy`, roles según tabla) montado en `app.ts`. Test de integración HTTP: `table.routes.test.ts` (201/200/204, 401 sin token, 403 con rol no permitido).
11. [ ] **API-11** Ruta pública `available` en `table.public.routes.ts` montada en `app.ts`. Test de integración: `table.public.routes.test.ts` (filtra por capacidad y estado, 400 sin `partySize`).
12. [ ] **API-12** Seed de mesas (idempotente, `INSERT OR IGNORE`) y actualizar `docs/dominio/modelo-datos.md` y `glosario.md`. Test: ejecutar el seed dos veces no duplica (test sobre `:memory:`); docs sin test.

### 6.2 Admin (`packages/web-admin`)

Verificación: specs de store con `ng test` (la tarea ADM-1 comprueba que el runner funciona) y `ng build`.

1. [x] **ADM-1** Modelos `Table`, `CreateTableDto`, `UpdateTableDto` y `TableService` (CRUD HTTP). Test: spec del servicio con `HttpTestingController` (URLs y métodos). Ficheros: `features/tables/models/table.model.ts`, `services/table.service.ts`.
2. [x] **ADM-2** `TableStore` (`loadByRestaurant`, `create`, `update`, `delete`, `loading`, `error`). Test: spec del store con servicio simulado. Fichero: `features/tables/store/table.store.ts`.
3. [x] **ADM-3** Página `table-list` (tabla con número, descripción, capacidad, badge de estado, editar/borrar con confirmación). Test: spec del componente (renderiza filas y estado vacío). Ficheros: `pages/table-list/`.
4. [x] **ADM-4** Página `table-form` (alta/edición con validación de número y capacidad; muestra el error de la API, p. ej. número duplicado). Test: spec (formulario inválido no envía; envía DTO válido). Ficheros: `pages/table-form/`.
5. [x] **ADM-5** `tables.routes.ts`, ruta `restaurants/:id/tables` en `app.routes.ts` y enlace "Mesas" en `restaurant-dashboard`. Test: spec de rutas (resuelve lista y formulario) + `ng build` sin errores.

### 6.3 Empleados (`packages/web-empleados`)

1. [ ] **EMP-1** Modelo `Table`, `TableStatus` y `TableService` (`getAll`, `updateStatus`). Test: spec con `HttpTestingController`. Ficheros: `features/tables/models/table.model.ts`, `services/table.service.ts`.
2. [ ] **EMP-2** `TableStore` (carga, `updateStatus` optimista con rollback en error, polling 30 s con `startPolling/stopPolling`, igual que `OrderStore`). Test: spec con temporizadores simulados. Fichero: `store/table.store.ts`.
3. [ ] **EMP-3** Selector derivado en el store: pedidos activos agrupados por `tableId` para mesas `ocupada` (combina `OrderStore.orders` y `TableStore.tables`). Test: spec del selector (mesa ocupada sin pedidos, con pedidos, pedidos de mesa libre se ignoran).
4. [ ] **EMP-4** Página `mesas` con tarjetas por mesa: número, capacidad, estado y selector para cambiarlo. Test: spec del componente (cambiar estado llama al store). Ficheros: `pages/mesas/mesas.component.{ts,html,css}`.
5. [ ] **EMP-5** En las mesas ocupadas, mostrar los pedidos con el estado de cada ítem (badge `badge-<estado>` ya existente). Test: spec del componente (renderiza ítems y estados).
6. [ ] **EMP-6** Ruta `mesas` y enlace "Mesas" en el shell. Test: spec de rutas + `ng build`.

### 6.4 Clientes (`packages/web-clientes`)

1. [ ] **CLI-1** Modelo `Table` y `TableService` (`getAvailable(restaurantId, partySize)`, `occupy(restaurantId, tableId)`). Test: spec con `HttpTestingController`. Ficheros: `core/models/table.model.ts`, `core/services/table.service.ts`.
2. [ ] **CLI-2** `CartStore` guarda `tableId` (`setTable`, `tableId`, `clear` lo limpia; cambiar de restaurante lo limpia). Test: spec del `CartStore`. Fichero: `core/store/cart.store.ts`.
3. [ ] **CLI-3** `OrderService.createOrder` envía `tableId` (parámetro nuevo) y `CartComponent` lo pasa desde el `CartStore`. Test: spec (el POST lleva `tableId`). Ficheros: `core/services/order.service.ts`, `features/cart/cart.component.ts`.
4. [ ] **CLI-4** Componente `table-select`, paso 1: entrada de personas (≥ 1) que consulta mesas disponibles y las lista (número, descripción, capacidad), con estado vacío. Test: spec del componente. Fichero: `features/tables/table-select.component.ts`.
5. [ ] **CLI-5** Paso 2: seleccionar mesa + "Continuar" → `occupy`, `CartStore.setTable` y navegación a la carta; en 409 refresca la lista y muestra el aviso. Test: spec (éxito navega, 409 muestra aviso y recarga).
6. [ ] **CLI-6** Rutas: `restaurants/:id` → `table-select`; `restaurants/:id/menu` → carta; guard funcional `tableSelectedGuard` que redirige si no hay `tableId`. Ajustar enlaces internos de `restaurant-menu` y `cart`. Test: spec del guard + `ng build`.

## 7. Criterios de aceptación

- [ ] Admin puede crear, listar, editar y eliminar mesas con id, número, descripción, capacidad y estado.
- [ ] Un cliente indica personas y solo ve mesas libres con capacidad suficiente.
- [ ] Al continuar la mesa pasa a `ocupada` y el cliente llega a la carta; sus pedidos llevan el `tableId`.
- [ ] Dos clientes no pueden ocupar la misma mesa (el segundo recibe 409 y aviso).
- [ ] Los empleados ven los estados de las mesas, los cambian y ven los pedidos de las mesas ocupadas.
- [ ] Todos los tests de la API pasan y los tres frontends compilan (`ng build`).

### Tests

- **Unitarios:** modelo, servicio y repositorio de mesas en la API (Vitest, mocks en `repositories/mocks/`); stores, servicios y guard de los frontends.
- **Integración / E2E:** rutas HTTP de mesas (roles, códigos de estado, carrera de `occupy`). Sin E2E de navegador (no hay infraestructura).

## 8. Impacto y riesgos

- **Retrocompatibilidad:** tabla nueva, sin tocar las existentes; `orders.table_id` ya existe y es opcional. Cambia la ruta `restaurants/:id` de `web-clientes` (ahora selección de mesa; la carta pasa a `/menu`).
- **Rendimiento:** consultas simples por `restaurant_id`; aceptables para el volumen esperado. Polling de mesas cada 30 s en empleados, sumado al de pedidos.
- **Seguridad:** `occupy` y `PATCH status` requieren autenticación; CRUD solo admin; validación de entrada en el servicio. El proyecto no valida que el empleado pertenezca al restaurante (limitación previa, no empeora).
- **Operación:** la tabla se crea al arrancar (migración en código); el seed añade mesas de ejemplo. Sin variables de entorno nuevas.

## 9. Suposiciones y preguntas abiertas

**Suposiciones**
- La rama se crea desde `main`, porque no existen `development` ni `master`.
- Un único documento de plan dividido por aplicación (sección 6), publicado como un solo comentario de la issue.
- Solo el admin hace CRUD; cualquier empleado (admin, manager, camarero, cocinero) cambia el estado.
- La mesa se libera a mano por el personal.
- Los frontends no tienen tests configurados: las tareas asumen `ng test` (Vitest, por defecto en Angular 21). Si no funciona sin dependencias nuevas, la primera tarea de cada frontend lo señalará y se verificará con `ng build`.
- El número de mesa es único por restaurante.

**Preguntas abiertas**
- ¿Debe `POST /orders` rechazar un `tableId` que no exista o no esté `ocupada`? (Lo decide el autor de la issue.)
- ¿Qué pasa con la mesa ocupada si el cliente abandona sin pedir? Hoy solo la libera el personal.
- ¿Debe el cliente poder cambiar de mesa después de ocuparla?

