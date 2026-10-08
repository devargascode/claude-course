# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Paquete

`@resttek/web-clientes`: app de pedidos para clientes (Angular 21), puerto 4202. El cliente se registra, navega restaurantes y su carta, llena el carrito, hace el pedido y lo consulta en "Mis pedidos".

## Comandos

Desde `packages/web-clientes` (o `npm run dev:clientes` desde la raíz):

```bash
npm start       # ng serve con proxy.conf.json → :4202, /api → http://localhost:3000
npm run build   # ng build
npm run watch   # build en modo watch (development)
```

Necesita la API arrancada en el puerto 3000. No hay tests configurados. Credenciales de prueba tras `npm run seed`: `cliente1@resttek.com` (contraseña = email). Tiene `.prettierrc` propio (`printWidth: 100`, comillas simples, parser `angular` para HTML).

## Arquitectura

Es la app **más distinta** de los tres frontends; no copies patrones de `web-admin` o `web-empleados`:

- **Estructura plana**: modelos, servicios y store centralizados en `src/app/core/` (`models/`, `services/`, `store/cart.store.ts`, `layout/shell.component.ts`). Las features (`cart`, `menu`, `orders`, `restaurants`) son componentes sueltos en `src/app/features/`, sin subcarpetas.
- **Sin stores de datos remotos**: los componentes consumen los `Observable` de los servicios directamente con `.subscribe()`. El único store es `CartStore` (carrito en signals).
- El componente raíz se llama `App` (`app.ts`, `app.html`, `app.css`), no `AppComponent`.
- Usa los endpoints públicos de la API (`/api/v1/public/restaurants/...`) para restaurantes y carta, y `/api/v1/orders` para pedidos. Autenticación, interceptores y componentes de login/registro vienen de `@resttek/web-shared`.
- Tiene su propio `package-lock.json` además del de la raíz; el monorepo se instala desde la raíz con `npm install`.
