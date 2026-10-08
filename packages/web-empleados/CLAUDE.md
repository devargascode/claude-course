# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Paquete

`@resttek/web-empleados`: app de operativa diaria para cocineros, camareros y gerentes (Angular 21), puerto 4201.

## Comandos

Desde `packages/web-empleados` (o `npm run dev:empleados` desde la raíz):

```bash
npm start       # ng serve con proxy.conf.json → :4201, /api → http://localhost:3000
npm run build   # ng build
npm run watch   # build en modo watch (development)
```

Necesita la API arrancada en el puerto 3000. No hay tests configurados. Credenciales de prueba tras `npm run seed`: `cocinero1@resttek.com` (cocina), `camarero1@resttek.com` (barra y salón); la contraseña es el propio email.

## Arquitectura

Standalone, signals y zoneless. Hay una única feature, `features/orders`, con tres páginas: **cocina**, **barra** y **salón** (rutas `/cocina`, `/barra`, `/salon`; la ruta vacía redirige a `/cocina`). Todo cuelga de `ShellComponent` protegido por `authGuard` de `@resttek/web-shared`.

- Estructura de feature: `models/ pages/ services/ store/`, igual que `web-admin`. Los componentes solo hablan con el store.
- `OrderStore` añade **polling cada 30 s**: `startPolling(restaurantId)` y `stopPolling()`. Quien lo arranque debe pararlo al destruir el componente, o se acumulan intervalos.
- Los pedidos se filtran por restaurante (`restaurantId` del empleado autenticado). El estado se actualiza **por ítem** (`updateItemStatus(orderId, itemId, status)`), no por pedido: cocina pasa los ítems de pendiente → preparando → listo, barra solo muestra los ítems de categoría `bebida` pendientes y los marca como listo, y salón muestra los ítems `listo` y los marca como entregado.
- Autenticación, interceptores y login vienen de `@resttek/web-shared`. `environment.apiUrl` es `/api/v1`.
