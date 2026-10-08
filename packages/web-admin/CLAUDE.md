# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Paquete

`@resttek/web-admin`: panel de administración (Angular 21), puerto 4200. Lo usan los roles admin y gerente para gestionar restaurantes, platos, ingredientes y empleados.

## Comandos

Desde `packages/web-admin` (o `npm run dev:admin` desde la raíz):

```bash
npm start       # ng serve con proxy.conf.json → :4200, /api → http://localhost:3000
npm run build   # ng build
npm run watch   # build en modo watch (development)
```

Necesita la API arrancada en el puerto 3000. No hay tests configurados. Credenciales de prueba: `admin@resttek.com` (contraseña = email) tras `npm run seed`.

## Arquitectura

Standalone components, signals y zoneless (`provideZonelessChangeDetection()` en `app.config.ts`). Rutas con lazy loading.

```
src/app/
├── app.config.ts    → providers: API_URL, interceptores de web-shared, iconos Lucide
├── app.routes.ts
├── core/layout/     → shell y not-found
└── features/<feature>/   (restaurants, dishes, ingredients, employees, dashboard)
    ├── <feature>.routes.ts
    ├── models/  pages/  services/  store/
```

- **Los componentes solo hablan con el store.** El store (`providedIn: 'root'`) tiene signals privadas `_datos/_loading/_error` expuestas con `.asReadonly()`, llama al service (que devuelve `Observable`) con `firstValueFrom`, y tras crear o actualizar modifica la lista en memoria con `.update()` en vez de recargar.
- Autenticación, interceptores y la pantalla de login vienen de `@resttek/web-shared`. Si cambias algo de eso, el cambio va en esa librería.
- **Iconos Lucide**: solo están registrados los listados en `LucideAngularModule.pick({...})` de `app.config.ts`. Para usar un icono nuevo hay que añadirlo en los dos sitios del import y del `pick`.
- `environment.apiUrl` es `/api/v1` (relativo, resuelto por el proxy).
