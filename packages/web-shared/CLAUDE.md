# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Paquete

`@resttek/web-shared`: librería Angular compartida por `web-admin`, `web-empleados` y `web-clientes`. No tiene comandos propios: no hay build, tests ni dev server. `package.json` apunta con `main` a `src/index.ts`, así que cada frontend la compila como código fuente dentro de su propio build.

## Qué contiene

Todo lo exportado está en `src/index.ts` (la API pública de la librería):

- `lib/tokens.ts`: el `InjectionToken` `API_URL`. Cada app debe proveerlo en su `app.config.ts` con `environment.apiUrl` (`/api/v1`).
- `lib/auth/`: `AuthService` (HTTP), `AuthStore` (estado con signals; el token se guarda en localStorage) y `authGuard`.
- `lib/http/`: `authInterceptor` (añade `Authorization: Bearer`) y `errorInterceptor`. Las apps los registran con `provideHttpClient(withInterceptors([...]))`.
- `lib/components/login` y `lib/components/register`: componentes standalone usados en las rutas `/login` de las apps.
- `lib/styles/base.css` y `lib/assets/images/`: estilos y logo. Las apps copian los assets con una entrada en `angular.json` (`../web-shared/src/lib/assets` → `/assets`).

## Reglas al modificar

- Cualquier símbolo nuevo que deban usar las apps debe **reexportarse en `src/index.ts`**; las apps importan solo desde `@resttek/web-shared`, nunca de rutas internas.
- Un cambio aquí afecta a las tres apps a la vez. Si cambias el contrato de `AuthStore`, `AuthService` o los interceptores, revisa los tres frontends.
- Angular no recarga los cambios de este paquete en caliente: hay que reiniciar el dev server del frontend.
- Mantén el estilo del resto: componentes standalone, signals, sin zone.js, guards e interceptors funcionales.
